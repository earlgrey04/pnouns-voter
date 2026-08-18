// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Nouns DAO の投票関数のうち、本コントラクトが使う最小限。
interface INounsDAO {
    function castRefundableVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external;
    function state(uint256 proposalId) external view returns (uint8);
    /// @dev ProposalCondensedV2(全フィールド静的、15 word)を返す。endBlock は 7 番目。
    function proposals(uint256 proposalId) external view returns (bytes memory);
}

/**
 * @title pNouns Voter
 * @notice pNouns NFT 保有者の署名付き投票をオンチェーンで集計し、その結果で Nouns DAO に投票するコントラクト。
 *
 *  - 投票者は EIP-712 で「提案ID / 賛否 / 自分の tokenId 群」に署名するだけ(ガス不要)。
 *  - 誰でも(通常はリレイヤー bot が)署名をまとめて castVotesBySig で投函できる。署名がなければ票は作れない。
 *  - 重み = tokenId 数。tokenId ごとに投票済みビットを立てるので、NFT を移しても再投票できない。
 *  - 締切(Nouns の endBlock − marginBlocks)を過ぎたら誰でも execute でき、
 *    tokens 最多 → 同数なら voters 最多 → それも同数なら棄権、を Nouns DAO に castRefundableVoteWithReason する。
 *    票がひとつもない提案は execute できない(NoVotes)= Nouns DAO には投票しない。
 *  - liveMode=false のあいだは Nouns DAO を呼ばず結果イベントだけ出す(シャドー運用用。executed は立てないので、
 *    後で liveMode=true にすれば同じ提案を本投票できる)。
 *  - 注意: Nouns の投票力は提案作成時点の委任で決まるため、委任を戻しても進行中の提案には効かない。
 *    緊急停止は setLiveMode(false)。
 *  - ガス払い戻し(案 B): 本コントラクトに預けられた ETH から、castVotesBySig / castVote の実行者(tx.origin)へ
 *    使ったガス代を同一 tx 内で返す(Nouns DAO の _refundGas と同じ方式)。単価・量・提案ごとの上限あり。
 *    残高が無ければ返金をスキップし、投票自体は成立させる。返金は best effort(送金失敗でも revert しない)。
 *
 *  Nouns 側の前提: この Nouns 保有ウォレット(マルチシグ)が本コントラクトに delegate() 済みであること。
 */
contract PNounsVoter is EIP712, Ownable {
    using Strings for uint256;

    // ---- 定数 -------------------------------------------------------------
    uint8 public constant AGAINST = 0;
    uint8 public constant FOR = 1;
    uint8 public constant ABSTAIN = 2;

    /// Nouns DAO の ProposalState
    uint8 internal constant STATE_PENDING = 0;
    uint8 internal constant STATE_ACTIVE = 1;

    bytes32 public constant VOTE_TYPEHASH =
        keccak256("Vote(uint256 proposalId,uint8 support,uint256[] tokenIds)");

    // ---- 不変値 -----------------------------------------------------------
    IERC721 public immutable pnouns;
    INounsDAO public immutable nounsDAO;

    // ---- 設定(owner が変更可) -------------------------------------------
    /// @notice 投票権から除外するアドレス(pNouns トレジャリーなど)
    mapping(address => bool) public excluded;
    /// @notice Nouns の endBlock の何ブロック前で締め切るか(この後 execute 可能)
    uint256 public marginBlocks;
    /// @notice true のとき execute が実際に Nouns DAO へ投票する。false はシャドー運用。
    bool public liveMode;
    /// @notice ガス払い戻しの有効/無効(owner が切替可)
    bool public refundEnabled = true;
    /// @notice 提案ごとの返金総額の上限(wei)。グリーフィング(細切れ投函)による預け金の目減りを抑える
    uint256 public refundCapPerProposal = 0.02 ether;
    /// @notice 提案ごとの返金済み額(wei)
    mapping(uint256 => uint256) public refundedForProposal;

    // 返金の上限(Nouns DAO と同じ考え方)
    uint256 public constant MAX_REFUND_PRIORITY_FEE = 2 gwei;
    uint256 public constant MAX_REFUND_BASE_FEE = 200 gwei;
    uint256 public constant REFUND_BASE_GAS = 55_000; // intrinsic 21000 + calldata + 計測後に走る SSTORE/送金/イベント分(gasleft() では測れない)
    uint256 public constant MAX_REFUND_GAS_BASE = 120_000; // 1 tx あたりの上限(基礎)
    uint256 public constant MAX_REFUND_GAS_PER_VOTE = 70_000; // + 票ごとの上限

    // ---- 集計状態 ---------------------------------------------------------
    /// @dev 1 スロットにパック(uint32×6 + uint48 + bool + uint8 = 256bit)。pNouns は 2100 枚なので uint32 で十分。
    struct Tally {
        uint32 againstTokens;
        uint32 forTokens;
        uint32 abstainTokens;
        uint32 againstVoters;
        uint32 forVoters;
        uint32 abstainVoters;
        uint48 deadline; // 初回投票時に Nouns の endBlock - marginBlocks をキャッシュ
        bool executed;
        uint8 result;
    }
    mapping(uint256 => Tally) internal _tallies;
    /// proposalId => (tokenId / 256) => ビットマップ
    mapping(uint256 => mapping(uint256 => uint256)) internal _votedBitmap;
    /// proposalId => voter => 投票済み
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ---- イベント ---------------------------------------------------------
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 support, uint256[] tokenIds, uint256 counted);
    event Executed(uint256 indexed proposalId, uint8 support, uint256[3] tokens, uint256[3] voters, bool live);
    event ExcludedSet(address indexed account, bool isExcluded);
    event MarginBlocksSet(uint256 marginBlocks);
    event LiveModeSet(bool live);
    event RefundableVote(address indexed refundee, uint256 refundAmount, bool refundSent);
    event RefundEnabledSet(bool enabled);
    event RefundCapPerProposalSet(uint256 cap);

    // ---- エラー -----------------------------------------------------------
    error InvalidSupport();
    error NoTokenIds();
    error ProposalNotVotable(uint8 state);
    error VotingClosed();
    error VotingNotClosed();
    error AlreadyVoted(address voter);
    error NotTokenOwner(uint256 tokenId, address owner);
    error ExcludedVoter(address voter);
    error NothingCounted();
    error AlreadyExecuted();
    error NoVotes();
    error MixedProposals();

    constructor(
        address pnouns_,
        address nounsDAO_,
        address owner_,
        address[] memory excluded_,
        uint256 marginBlocks_
    ) EIP712("pNouns Voter", "1") Ownable(owner_) {
        pnouns = IERC721(pnouns_);
        nounsDAO = INounsDAO(nounsDAO_);
        marginBlocks = marginBlocks_;
        for (uint256 i = 0; i < excluded_.length; i++) {
            excluded[excluded_[i]] = true;
            emit ExcludedSet(excluded_[i], true);
        }
    }

    // ---- 設定 -------------------------------------------------------------
    function setExcluded(address account, bool isExcluded) external onlyOwner {
        excluded[account] = isExcluded;
        emit ExcludedSet(account, isExcluded);
    }

    function setMarginBlocks(uint256 marginBlocks_) external onlyOwner {
        marginBlocks = marginBlocks_;
        emit MarginBlocksSet(marginBlocks_);
    }

    function setLiveMode(bool live) external onlyOwner {
        liveMode = live;
        emit LiveModeSet(live);
    }

    function setRefundEnabled(bool enabled) external onlyOwner {
        refundEnabled = enabled;
        emit RefundEnabledSet(enabled);
    }

    function setRefundCapPerProposal(uint256 cap) external onlyOwner {
        refundCapPerProposal = cap;
        emit RefundCapPerProposalSet(cap);
    }

    /// @notice 預け金(返金原資)や誤送金を回収する
    function sweep(address payable to) external onlyOwner {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "sweep failed");
    }

    receive() external payable {}

    // ---- 参照 -------------------------------------------------------------
    struct VoteSig {
        uint256 proposalId;
        uint8 support;
        uint256[] tokenIds;
        bytes signature;
    }

    function tally(uint256 proposalId)
        external
        view
        returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result)
    {
        Tally storage t = _tallies[proposalId];
        (tokens, voters) = _arrays(t);
        return (tokens, voters, t.executed, t.result);
    }

    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
    }

    /// @notice Nouns 側の endBlock。proposals() の返り値(ProposalCondensedV2、15 word)を型付きで decode し、
    ///         id の一致と startBlock < endBlock を検証する(Nouns DAO のアップグレードでレイアウトが変わった場合に誤読しないため)。
    function nounsEndBlock(uint256 proposalId) public view returns (uint256) {
        (bool ok, bytes memory data) = address(nounsDAO).staticcall(
            abi.encodeWithSelector(INounsDAO.proposals.selector, proposalId)
        );
        require(ok && data.length == 15 * 32, "proposals() layout mismatch");
        uint256 id;
        uint256 startBlock;
        uint256 endBlock;
        assembly {
            id := mload(add(data, 0x20)) // word 0: id
            startBlock := mload(add(data, 0xc0)) // word 5: startBlock
            endBlock := mload(add(data, 0xe0)) // word 6: endBlock
        }
        require(id == proposalId && endBlock > startBlock, "proposals() sanity check failed");
        return endBlock;
    }

    /// @notice この提案の pNouns Voter 側締切ブロック。これ以降は投票不可・execute 可。
    function voteDeadline(uint256 proposalId) public view returns (uint256) {
        uint256 endBlock = nounsEndBlock(proposalId);
        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
    }

    function hashVote(uint256 proposalId, uint8 support, uint256[] calldata tokenIds) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(VOTE_TYPEHASH, proposalId, support, keccak256(abi.encodePacked(tokenIds))))
        );
    }

    /// @notice 締切後の判定結果(execute 前でも参照可)。tokens 最多 → voters 最多 → 棄権。
    function currentResult(uint256 proposalId) public view returns (uint8) {
        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(_tallies[proposalId]);
        return _decide(tokens, voters);
    }

    function _arrays(Tally storage t) internal view returns (uint256[3] memory tokens, uint256[3] memory voters) {
        tokens = [uint256(t.againstTokens), t.forTokens, t.abstainTokens];
        voters = [uint256(t.againstVoters), t.forVoters, t.abstainVoters];
    }

    // ---- 投票 -------------------------------------------------------------
    /// @notice 本人が自分で投票する(リレイヤーを介さない退路)。ガスは預け金から払い戻される。
    function castVote(uint256 proposalId, uint8 support, uint256[] calldata tokenIds) external {
        uint256 startGas = gasleft();
        _castVote(msg.sender, proposalId, support, tokenIds);
        _refundGas(startGas, 1, proposalId);
    }

    /// @notice 署名付き投票をまとめて投函する。誰でも呼べ、ガスは預け金から払い戻される。
    function castVotesBySig(VoteSig[] calldata votes) external {
        uint256 startGas = gasleft();
        for (uint256 i = 0; i < votes.length; i++) {
            VoteSig calldata v = votes[i];
            if (v.proposalId != votes[0].proposalId) revert MixedProposals(); // 返金の提案別会計のため 1 バッチ = 1 提案
            address voter = ECDSA.recover(hashVote(v.proposalId, v.support, v.tokenIds), v.signature);
            _castVote(voter, v.proposalId, v.support, v.tokenIds);
        }
        if (votes.length > 0) _refundGas(startGas, votes.length, votes[0].proposalId);
    }

    /// @dev Nouns DAO の _refundGas 準拠。返金は best effort で、失敗しても投票は成立する。
    function _refundGas(uint256 startGas, uint256 voteCount, uint256 proposalId) internal {
        if (!refundEnabled) return;
        unchecked {
            uint256 balance = address(this).balance;
            if (balance == 0) return;
            uint256 remainingCap = refundCapPerProposal > refundedForProposal[proposalId]
                ? refundCapPerProposal - refundedForProposal[proposalId] : 0;
            if (remainingCap == 0) return;
            uint256 basefee = _min(block.basefee, MAX_REFUND_BASE_FEE);
            uint256 gasPrice = _min(tx.gasprice, basefee + MAX_REFUND_PRIORITY_FEE);
            uint256 gasUsed = _min(startGas - gasleft() + REFUND_BASE_GAS, MAX_REFUND_GAS_BASE + MAX_REFUND_GAS_PER_VOTE * voteCount);
            uint256 refundAmount = _min(_min(gasPrice * gasUsed, balance), remainingCap);
            if (refundAmount == 0) return;
            (bool refundSent, ) = tx.origin.call{value: refundAmount}("");
            if (refundSent) refundedForProposal[proposalId] += refundAmount; // 送金成功時だけ枠を消費(失敗で枠を潰させない)
            emit RefundableVote(tx.origin, refundAmount, refundSent);
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds) internal {
        if (support > ABSTAIN) revert InvalidSupport();
        if (tokenIds.length == 0) revert NoTokenIds();
        if (excluded[voter]) revert ExcludedVoter(voter);
        if (hasVoted[proposalId][voter]) revert AlreadyVoted(voter);

        Tally storage t = _tallies[proposalId];
        uint256 deadline = t.deadline;
        if (deadline == 0) {
            // 提案ごとに初回だけ Nouns 側を確認(Updatable 中や取消済みの提案は受け付けない)
            uint8 st = nounsDAO.state(proposalId);
            if (st != STATE_PENDING && st != STATE_ACTIVE) revert ProposalNotVotable(st);
            deadline = voteDeadline(proposalId);
            t.deadline = uint48(deadline);
        }
        if (block.number >= deadline) revert VotingClosed();

        uint256 counted;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 id = tokenIds[i];
            address owner = pnouns.ownerOf(id);
            if (owner != voter) revert NotTokenOwner(id, owner);
            uint256 word = id >> 8;
            uint256 bit = 1 << (id & 0xff);
            uint256 map = _votedBitmap[proposalId][word];
            if (map & bit != 0) continue; // 既に(前の所有者が)投票済みの token は数えない
            _votedBitmap[proposalId][word] = map | bit;
            counted++;
        }
        if (counted == 0) revert NothingCounted();

        hasVoted[proposalId][voter] = true;
        if (support == FOR) {
            t.forTokens += uint32(counted);
            t.forVoters += 1;
        } else if (support == AGAINST) {
            t.againstTokens += uint32(counted);
            t.againstVoters += 1;
        } else {
            t.abstainTokens += uint32(counted);
            t.abstainVoters += 1;
        }
        emit VoteCast(proposalId, voter, support, tokenIds, counted);
    }

    // ---- 実行 -------------------------------------------------------------
    /// @notice 締切後に誰でも呼べる。結果を Nouns DAO に投票する(liveMode 時)。ガスは Nouns の refund で執行者に戻る。
    function execute(uint256 proposalId) external {
        Tally storage t = _tallies[proposalId];
        if (t.executed) revert AlreadyExecuted();
        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
        if (block.number < deadline) revert VotingNotClosed();

        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(t);
        if (tokens[0] + tokens[1] + tokens[2] == 0) revert NoVotes(); // 票ゼロ → 投票しない
        uint8 support = _decide(tokens, voters);
        if (!liveMode) {
            // シャドー運用: 結果イベントだけ出し、executed は立てない(後で liveMode=true にすれば本投票できる)
            emit Executed(proposalId, support, tokens, voters, false);
            return;
        }
        t.executed = true;
        t.result = support;
        nounsDAO.castRefundableVoteWithReason(proposalId, support, _reason(tokens, voters, support));
        emit Executed(proposalId, support, tokens, voters, true);
    }

    function _decide(uint256[3] memory tokens, uint256[3] memory voters) internal pure returns (uint8) {
        uint256 maxTokens = _max3(tokens[0], tokens[1], tokens[2]);
        if (maxTokens == 0) return ABSTAIN; // 票ゼロ(execute では NoVotes で拒否される。表示用の既定値)
        // tokens 最多の候補のうち voters 最多を選ぶ。単独最多なら即決。
        uint8 winner = 3; // 未定
        uint256 bestVoters;
        bool tie;
        for (uint8 s = 0; s < 3; s++) {
            if (tokens[s] != maxTokens) continue;
            if (winner == 3 || voters[s] > bestVoters) {
                winner = s;
                bestVoters = voters[s];
                tie = false;
            } else if (voters[s] == bestVoters) {
                tie = true;
            }
        }
        return tie ? ABSTAIN : winner;
    }

    function _max3(uint256 a, uint256 b, uint256 c) internal pure returns (uint256 m) {
        m = a > b ? a : b;
        if (c > m) m = c;
    }

    function _reason(uint256[3] memory tokens, uint256[3] memory voters, uint8 support) internal pure returns (string memory) {
        string memory word = support == FOR ? "FOR" : support == AGAINST ? "AGAINST" : "ABSTAIN";
        return string.concat(
            "pNouns holders voted on-chain via pNouns Voter: ", word,
            " (tokens for/against/abstain = ", tokens[1].toString(), "/", tokens[0].toString(), "/", tokens[2].toString(),
            ", voters = ", voters[1].toString(), "/", voters[0].toString(), "/", voters[2].toString(), ")"
        );
    }
}
