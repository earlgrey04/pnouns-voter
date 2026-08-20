// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
// テスト用の最小 EIP-1271 ウォレット: owner の ECDSA 署名を isValidSignature で受理する
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
contract Mock1271Wallet {
    address public immutable owner;
    constructor(address owner_) { owner = owner_; }
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        return ECDSA.recover(hash, signature) == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) { return this.onERC721Received.selector; }
}
