// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title LoopPay merchant ownership, token allowlist and emergency switch.
contract LoopPayRegistry is AccessControl, Pausable {
    bytes32 public constant TOKEN_MANAGER_ROLE = keccak256("TOKEN_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Merchant {
        address owner;
        address payout;
        string metadataURI;
    }
    mapping(uint256 => Merchant) public merchants;
    mapping(address => uint256) public merchantOf;
    mapping(address => bool) public approvedTokens;
    uint256 public merchantCount;
    error InvalidAddress();
    error NotOwner();
    error AlreadyRegistered();
    error InvalidToken();
    event MerchantCreated(uint256 indexed merchantId, address indexed owner, address payout, string metadataURI);
    event MerchantUpdated(uint256 indexed merchantId, address payout, string metadataURI);
    event TokenApprovalChanged(address indexed token, bool approved);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TOKEN_MANAGER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /// @notice Metadata contains public business information only.
    function createMerchant(address payout, string calldata metadataURI) external whenNotPaused returns (uint256 id) {
        if (payout == address(0)) revert InvalidAddress();
        if (merchantOf[msg.sender] != 0) revert AlreadyRegistered();
        id = ++merchantCount;
        merchants[id] = Merchant(msg.sender, payout, metadataURI);
        merchantOf[msg.sender] = id;
        emit MerchantCreated(id, msg.sender, payout, metadataURI);
    }

    function updateMerchant(uint256 id, address payout, string calldata metadataURI) external whenNotPaused {
        requireOwner(id, msg.sender);
        if (payout == address(0)) revert InvalidAddress();
        merchants[id].payout = payout;
        merchants[id].metadataURI = metadataURI;
        emit MerchantUpdated(id, payout, metadataURI);
    }

    function requireOwner(uint256 id, address caller) public view {
        if (merchants[id].owner != caller || caller == address(0)) revert NotOwner();
    }

    function payoutOf(uint256 id) external view returns (address) {
        return merchants[id].payout;
    }

    function setToken(address token, bool approved) external onlyRole(TOKEN_MANAGER_ROLE) {
        if (token.code.length == 0) revert InvalidToken();
        approvedTokens[token] = approved;
        emit TokenApprovalChanged(token, approved);
    }

    function setPaused(bool value) external onlyRole(PAUSER_ROLE) {
        if (value) _pause();
        else _unpause();
    }
}
