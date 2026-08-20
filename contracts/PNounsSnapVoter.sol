// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4);
}

interface INounsDAO {
    function castRefundableVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external;
    function state(uint256 proposalId) external view returns (uint8);
    function proposals(uint256 proposalId) external view returns (bytes memory);
}

/**
 * @title pNouns Snap Voter
 * @notice pNouns 保有者が **Snapshot(pnounsdao.eth) で投じた投票署名そのもの** をオンチェーンで検証・集計し、
 *         締切後に Nouns DAO へ castRefundableVoteWithReason する。メンバーの投票体験は今の Snapshot のまま。
 *
 *  検証する署名 = Snapshot(snapshot-v2)の EIP-712 Vote メッセージ:
 *    domain: {name:"snapshot", version:"0.1.4"}(chainId / verifyingContract なし)
 *    Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)
 *    choice: 1=賛成(FOR) / 2=反対(AGAINST) / 3=棄権(ABSTAIN) — pNouns の提案は必ずこの並びで作成する。
 *
 *  - registrar が「Snapshot 提案(文字列 id) ↔ Nouns 提案 id」の対応を事前登録する(各 1 回のみ・公開情報なので誰でも検証可)。
 *  - 重み = 提出時点の pNouns 保有 tokenId 数(tokenIds はリレイヤーが添える。所有確認はコントラクトが行うため水増し不可)。
 *  - Snapshot は投票のやり直しができるため、同一投票者は timestamp がより新しい署名で上書きできる(最新が有効)。
 *  - tokenId 単位のビットマップで、同じ NFT が(移転を挟んでも)二重に数えられることを防ぐ。
 *  - 締切 = Nouns の endBlock − marginBlocks。締切後は誰でも execute。票ゼロは投票しない(NoVotes)。
 *  - ガス払い戻し: 預け金から実行者(tx.origin)へ返金(上限つき・best effort)。CEI + nonReentrant。
 *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
 */
contract PNounsSnapVoter is Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint8 public constant AGAINST = 0;
    uint8 public constant FOR = 1;
    uint8 public constant ABSTAIN = 2;
    uint8 internal constant STATE_PENDING = 0;
    uint8 internal constant STATE_ACTIVE = 1;

    // Snapshot の EIP-712(フィールドは name と version のみ)
    bytes32 internal constant SNAP_DOMAIN_SEPARATOR = keccak256(
        abi.encode(keccak256("EIP712Domain(string name,string version)"), keccak256(bytes("snapshot")), keccak256(bytes("0.1.4")))
    );
    bytes32 internal constant SNAP_VOTE_TYPEHASH = keccak256(
        "Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)"
    );

    IERC721 public immutable pnouns;
    INounsDAO public immutable nounsDAO;
    /// @notice 対象の Snapshot スペース(例: "pnounsdao.eth")のハッシュ
    bytes32 public immutable spaceHash;

    mapping(address => bool) public excluded;
    uint256 public marginBlocks;
    bool public liveMode;
    /// @notice Snapshot 提案 ↔ Nouns 提案の対応付けを登録できるアドレス
    address public registrar;

    bool public refundEnabled = true;
    uint256 public refundCapPerProposal = 0.02 ether;
    mapping(uint256 => uint256) public refundedForProposal;
    uint256 public constant MAX_REFUND_PRIORITY_FEE = 2 gwei;
    uint256 public constant MAX_REFUND_BASE_FEE = 200 gwei;
    uint256 public constant REFUND_BASE_GAS = 55_000;
    uint256 public constant MAX_REFUND_GAS_BASE = 120_000;
    uint256 public constant MAX_REFUND_GAS_PER_VOTE = 90_000;

    struct Tally {
        uint32 againstTokens; uint32 forTokens; uint32 abstainTokens;
        uint32 againstVoters; uint32 forVoters; uint32 abstainVoters;
        uint48 deadline; bool executed; uint8 result;
    }
    mapping(uint256 => Tally) internal _tallies;
    mapping(uint256 => mapping(uint256 => uint256)) internal _votedBitmap;

    struct VoterRec { bool exists; uint8 support; uint32 counted; uint64 timestamp; bytes32 digest; }
    mapping(uint256 => mapping(address => VoterRec)) public voterRec;

    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
    uint256 public registrationDelayBlocks;
    /// Nouns 提案 id → 登録ブロック
    mapping(uint256 => uint256) public registeredAtBlock;
    /// keccak(Snapshot 提案 id 文字列) → Nouns 提案 id
    mapping(bytes32 => uint256) public snapToNouns;
    /// Nouns 提案 id → keccak(Snapshot 提案 id 文字列)
    mapping(uint256 => bytes32) public nounsToSnap;

    struct SnapVote {
        string from;      // 署名メッセージの from(チェックサム表記のアドレス文字列)
        uint64 timestamp;
        string proposal;  // Snapshot 提案 id(文字列)
        uint32 choice;    // 1=賛成 2=反対 3=棄権
        string reason;
        string app;
        string metadata;
        bytes signature;
        uint256[] tokenIds; // リレイヤーが添える投票者の保有 tokenId(所有はコントラクトが検証)
    }

    event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal);
    event ProposalUnregistered(uint256 indexed nounsProposalId, bytes32 snapHash);
    event RegistrationDelaySet(uint256 blocks_);
    event SnapVoteCounted(uint256 indexed nounsProposalId, address indexed voter, uint8 support, uint32 counted, uint64 timestamp, bool revote);
    event Executed(uint256 indexed proposalId, uint8 support, uint256[3] tokens, uint256[3] voters, bool live);
    event ExcludedSet(address indexed account, bool isExcluded);
    event MarginBlocksSet(uint256 marginBlocks);
    event LiveModeSet(bool live);
    event RegistrarSet(address registrar);
    event RefundableVote(address indexed refundee, uint256 refundAmount, bool refundSent);
    event RefundEnabledSet(bool enabled);
    event RefundCapPerProposalSet(uint256 cap);

    error NotRegistrar();
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidChoice();
    error WrongSpace();
    error FromMismatch();
    error NoTokenIds();
    error ProposalNotVotable(uint8 state);
    error VotingClosed();
    error VotingNotClosed();
    error StaleVote();
    error RegistrationTooRecent();
    error VotesAlreadyCounted();
    error InvalidFromAddress();
    error InvalidContractSignature();
    error NotTokenOwner(uint256 tokenId, address owner);
    error ExcludedVoter(address voter);
    error NothingCounted();
    error AlreadyExecuted();
    error NoVotes();
    error MixedProposals();

    constructor(
        address pnouns_, address nounsDAO_, address owner_, address registrar_,
        string memory space_, address[] memory excluded_, uint256 marginBlocks_
    ) Ownable(owner_) {
        pnouns = IERC721(pnouns_);
        nounsDAO = INounsDAO(nounsDAO_);
        spaceHash = keccak256(bytes(space_));
        registrar = registrar_;
        marginBlocks = marginBlocks_;
        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
    }

    // ---- 設定 ----
    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
    function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
    function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); require(ok, "sweep failed"); }
    receive() external payable {}

    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
        bytes32 h = keccak256(bytes(snapshotProposal));
        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
        if (nounsProposalId == 0) revert NotRegistered();
        snapToNouns[h] = nounsProposalId;
        nounsToSnap[nounsProposalId] = h;
        registeredAtBlock[nounsProposalId] = block.number;
        emit ProposalRegistered(nounsProposalId, snapshotProposal);
    }

    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
    function unregisterProposal(uint256 nounsProposalId) external {
        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
        bytes32 h = nounsToSnap[nounsProposalId];
        if (h == bytes32(0)) revert NotRegistered();
        (uint256[3] memory tokens, ) = _arrays(_tallies[nounsProposalId]);
        if (tokens[0] + tokens[1] + tokens[2] != 0) revert VotesAlreadyCounted();
        delete snapToNouns[h];
        delete nounsToSnap[nounsProposalId];
        delete registeredAtBlock[nounsProposalId];
        emit ProposalUnregistered(nounsProposalId, h);
    }

    // ---- 参照 ----
    function tally(uint256 proposalId) external view returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result) {
        Tally storage t = _tallies[proposalId];
        (tokens, voters) = _arrays(t);
        return (tokens, voters, t.executed, t.result);
    }
    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
    }
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) { return voterRec[proposalId][voter].exists; }

    function nounsEndBlock(uint256 proposalId) public view returns (uint256) {
        (bool ok, bytes memory data) = address(nounsDAO).staticcall(abi.encodeWithSelector(INounsDAO.proposals.selector, proposalId));
        require(ok && data.length == 15 * 32, "proposals() layout mismatch");
        uint256 id; uint256 startBlock; uint256 endBlock;
        assembly { id := mload(add(data, 0x20)) startBlock := mload(add(data, 0xc0)) endBlock := mload(add(data, 0xe0)) }
        require(id == proposalId && endBlock > startBlock, "proposals() sanity check failed");
        return endBlock;
    }
    function voteDeadline(uint256 proposalId) public view returns (uint256) {
        uint256 endBlock = nounsEndBlock(proposalId);
        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
    }
    function currentResult(uint256 proposalId) public view returns (uint8) {
        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(_tallies[proposalId]);
        return _decide(tokens, voters);
    }

    /// @notice Snapshot の Vote メッセージの EIP-712 ダイジェスト
    function snapVoteDigest(SnapVote calldata v) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            SNAP_VOTE_TYPEHASH,
            keccak256(bytes(v.from)),
            spaceHash, // space は本コントラクトのスペースに固定(異なる space の署名は復元アドレスが一致しない)
            v.timestamp,
            keccak256(bytes(v.proposal)),
            v.choice,
            keccak256(bytes(v.reason)),
            keccak256(bytes(v.app)),
            keccak256(bytes(v.metadata))
        ));
        return keccak256(abi.encodePacked("\x19\x01", SNAP_DOMAIN_SEPARATOR, structHash));
    }

    // ---- 投票 ----
    /// @notice Snapshot の投票署名をまとめて検証・集計する。誰でも呼べ、ガスは預け金から払い戻し。1 バッチ 1 提案。
    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
        uint256 startGas = gasleft();
        if (votes.length == 0) return;
        bytes32 firstProp = keccak256(bytes(votes[0].proposal));
        uint256 nounsId = snapToNouns[firstProp];
        if (nounsId == 0) revert NotRegistered();
        if (block.number < registeredAtBlock[nounsId] + registrationDelayBlocks) revert RegistrationTooRecent(); // 誤登録の取消猶予
        for (uint256 i = 0; i < votes.length; i++) {
            SnapVote calldata v = votes[i];
            if (keccak256(bytes(v.proposal)) != firstProp) revert MixedProposals();
            bytes32 digest = snapVoteDigest(v);
            address fromAddr = _parseAddress(v.from);
            if (fromAddr.code.length == 0) {
                // EOA: ECDSA 復元が from と一致すること
                if (ECDSA.recover(digest, v.signature) != fromAddr) revert FromMismatch();
            } else {
                // スマートウォレット(Safe 等): EIP-1271 で検証
                if (IERC1271(fromAddr).isValidSignature(digest, v.signature) != bytes4(0x1626ba7e)) revert InvalidContractSignature();
            }
            uint8 support = _choiceToSupport(v.choice);
            _castVote(fromAddr, nounsId, support, v.tokenIds, v.timestamp, digest);
        }
        _refundGas(startGas, votes.length, nounsId);
    }

    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
    function castVote(uint256 nounsProposalId, uint8 support, uint256[] calldata tokenIds) external nonReentrant {
        uint256 startGas = gasleft();
        if (support > ABSTAIN) revert InvalidChoice();
        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
        _refundGas(startGas, 1, nounsProposalId);
    }

    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds, uint64 timestamp, bytes32 digest) internal {
        if (tokenIds.length == 0) revert NoTokenIds();
        if (excluded[voter]) revert ExcludedVoter(voter);

        Tally storage t = _tallies[proposalId];
        uint256 deadline = t.deadline;
        if (deadline == 0) {
            uint8 st = nounsDAO.state(proposalId);
            if (st != STATE_PENDING && st != STATE_ACTIVE) revert ProposalNotVotable(st);
            deadline = voteDeadline(proposalId);
            t.deadline = uint48(deadline);
        }
        if (block.number >= deadline) revert VotingClosed();

        VoterRec storage rec = voterRec[proposalId][voter];
        bool supplement = rec.exists && timestamp == rec.timestamp && digest == rec.digest; // 同一署名の再提出 = token の補完(先回り 1 枚投函への対策)
        if (rec.exists && !supplement && timestamp <= rec.timestamp) revert StaleVote(); // やり直しは新しい署名のみ

        uint256 counted = _countTokens(proposalId, voter, tokenIds);

        if (!rec.exists) {
            if (counted == 0) revert NothingCounted();
            _addTally(t, support, uint32(counted), 1);
            voterRec[proposalId][voter] = VoterRec(true, support, uint32(counted), timestamp, digest);
            emit SnapVoteCounted(proposalId, voter, support, uint32(counted), timestamp, false);
        } else if (supplement) {
            // 同じ署名で未計上の token だけ追加(support は変わらず、投票者数も増やさない)
            if (counted == 0) revert NothingCounted();
            _addTally(t, rec.support, uint32(counted), 0);
            rec.counted += uint32(counted);
            emit SnapVoteCounted(proposalId, voter, rec.support, rec.counted, timestamp, false);
        } else {
            // やり直し: 既存の counted を新しい support へ移し、新たに数えられた token があれば加算
            _subTally(t, rec.support, rec.counted, 1);
            uint32 newCounted = rec.counted + uint32(counted);
            _addTally(t, support, newCounted, 1);
            rec.support = support; rec.counted = newCounted; rec.timestamp = timestamp; rec.digest = digest;
            emit SnapVoteCounted(proposalId, voter, support, newCounted, timestamp, true);
        }
    }

    /// @dev voter が所有する未カウントの tokenId をビットマップに立てて数える
    function _countTokens(uint256 proposalId, address voter, uint256[] calldata tokenIds) internal returns (uint256 counted) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 id = tokenIds[i];
            address ownerOf = pnouns.ownerOf(id);
            if (ownerOf != voter) revert NotTokenOwner(id, ownerOf);
            uint256 word = id >> 8;
            uint256 bit = 1 << (id & 0xff);
            uint256 map = _votedBitmap[proposalId][word];
            if (map & bit != 0) continue;
            _votedBitmap[proposalId][word] = map | bit;
            counted++;
        }
    }

    function _addTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
        // voters=0 は「補完」(同一署名で token を追加)の場合
        if (s == FOR) { t.forTokens += tokens; t.forVoters += voters; }
        else if (s == AGAINST) { t.againstTokens += tokens; t.againstVoters += voters; }
        else { t.abstainTokens += tokens; t.abstainVoters += voters; }
    }
    function _subTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
        if (s == FOR) { t.forTokens -= tokens; t.forVoters -= voters; }
        else if (s == AGAINST) { t.againstTokens -= tokens; t.againstVoters -= voters; }
        else { t.abstainTokens -= tokens; t.abstainVoters -= voters; }
    }

    // ---- 実行 ----
    function execute(uint256 proposalId) external nonReentrant {
        Tally storage t = _tallies[proposalId];
        if (t.executed) revert AlreadyExecuted();
        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
        if (block.number < deadline) revert VotingNotClosed();
        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(t);
        if (tokens[0] + tokens[1] + tokens[2] == 0) revert NoVotes();
        uint8 support = _decide(tokens, voters);
        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
        t.executed = true; t.result = support;
        nounsDAO.castRefundableVoteWithReason(proposalId, support, _reason(tokens, voters, support));
        emit Executed(proposalId, support, tokens, voters, true);
    }

    // ---- 内部 ----
    function _choiceToSupport(uint32 choice) internal pure returns (uint8) {
        if (choice == 1) return FOR;
        if (choice == 2) return AGAINST;
        if (choice == 3) return ABSTAIN;
        revert InvalidChoice();
    }

    /// @dev "0x…" 42 文字の 16 進文字列を address へ厳密変換(不正なら revert)
    function _parseAddress(string calldata str) internal pure returns (address) {
        bytes calldata b = bytes(str);
        if (b.length != 42 || b[0] != "0" || (b[1] != "x" && b[1] != "X")) revert InvalidFromAddress();
        uint160 v;
        for (uint256 i = 2; i < 42; i++) {
            uint8 c = uint8(b[i]);
            uint8 nib;
            if (c >= 48 && c <= 57) nib = c - 48;        // 0-9
            else if (c >= 97 && c <= 102) nib = c - 87;  // a-f
            else if (c >= 65 && c <= 70) nib = c - 55;   // A-F
            else revert InvalidFromAddress();
            v = (v << 4) | uint160(nib);
        }
        return address(v);
    }

    function _arrays(Tally storage t) internal view returns (uint256[3] memory tokens, uint256[3] memory voters) {
        tokens = [uint256(t.againstTokens), t.forTokens, t.abstainTokens];
        voters = [uint256(t.againstVoters), t.forVoters, t.abstainVoters];
    }
    function _decide(uint256[3] memory tokens, uint256[3] memory voters) internal pure returns (uint8) {
        uint256 maxTokens = _max3(tokens[0], tokens[1], tokens[2]);
        if (maxTokens == 0) return ABSTAIN;
        uint8 winner = 3; uint256 bestVoters; bool tie;
        for (uint8 s = 0; s < 3; s++) {
            if (tokens[s] != maxTokens) continue;
            if (winner == 3 || voters[s] > bestVoters) { winner = s; bestVoters = voters[s]; tie = false; }
            else if (voters[s] == bestVoters) { tie = true; }
        }
        return tie ? ABSTAIN : winner;
    }
    function _max3(uint256 a, uint256 b, uint256 c) internal pure returns (uint256 m) { m = a > b ? a : b; if (c > m) m = c; }

    function _reason(uint256[3] memory tokens, uint256[3] memory voters, uint8 support) internal pure returns (string memory) {
        string memory word = support == FOR ? "FOR" : support == AGAINST ? "AGAINST" : "ABSTAIN";
        return string.concat(
            "pNouns holders voted on Snapshot (pnounsdao.eth), verified on-chain by pNouns Snap Voter: ", word,
            " (tokens for/against/abstain = ", tokens[1].toString(), "/", tokens[0].toString(), "/", tokens[2].toString(),
            ", voters = ", voters[1].toString(), "/", voters[0].toString(), "/", voters[2].toString(), ")"
        );
    }

    function _refundGas(uint256 startGas, uint256 voteCount, uint256 proposalId) internal {
        if (!refundEnabled) return;
        unchecked {
            uint256 balance = address(this).balance;
            if (balance == 0) return;
            uint256 remainingCap = refundCapPerProposal > refundedForProposal[proposalId] ? refundCapPerProposal - refundedForProposal[proposalId] : 0;
            if (remainingCap == 0) return;
            uint256 basefee = _min(block.basefee, MAX_REFUND_BASE_FEE);
            uint256 gasPrice = _min(tx.gasprice, basefee + MAX_REFUND_PRIORITY_FEE);
            uint256 gasUsed = _min(startGas - gasleft() + REFUND_BASE_GAS, MAX_REFUND_GAS_BASE + MAX_REFUND_GAS_PER_VOTE * voteCount);
            uint256 refundAmount = _min(_min(gasPrice * gasUsed, balance), remainingCap);
            if (refundAmount == 0) return;
            refundedForProposal[proposalId] += refundAmount;
            (bool refundSent, ) = tx.origin.call{value: refundAmount}("");
            if (!refundSent) refundedForProposal[proposalId] -= refundAmount;
            emit RefundableVote(tx.origin, refundAmount, refundSent);
        }
    }
    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
}
