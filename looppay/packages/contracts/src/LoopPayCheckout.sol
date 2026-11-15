// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LoopPayRegistry} from "./LoopPayRegistry.sol";
import {ILoopPayRewards} from "./interfaces/ILoopPayRewards.sol";

/// @title Direct merchant settlement, without protocol fees or pooled customer balances.
contract LoopPayCheckout is ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum Status {
        Open,
        Paid,
        Cancelled
    }

    struct Invoice {
        uint256 invoiceId;
        uint256 merchantId;
        address token;
        uint256 amount;
        bytes32 orderReferenceHash;
        uint64 expiresAt;
        uint256 campaignId;
        Status status;
    }
    mapping(uint256 => bool) public isTestInvoice;
    event InvoiceTestMarked(uint256 indexed invoiceId);
    event PaymentClassified(uint256 indexed invoiceId, bool isTest, bool eligible, uint8 reason);
    LoopPayRegistry public immutable registry;
    ILoopPayRewards public immutable rewards;
    uint256 public invoiceCount;
    mapping(uint256 => Invoice) public invoices;
    error InvalidAmount();
    error UnsupportedToken();
    error InvalidExpiry();
    error InvalidInvoice();
    error NotOpen();
    error Expired();
    error Paused();
    error InvalidCampaign();
    event InvoiceCreated(
        uint256 indexed invoiceId,
        uint256 indexed merchantId,
        address token,
        uint256 amount,
        bytes32 orderReferenceHash,
        uint64 expiresAt,
        uint256 campaignId
    );
    event InvoicePaid(
        uint256 indexed invoiceId,
        uint256 indexed merchantId,
        address indexed customer,
        address token,
        uint256 amount,
        address payout
    );
    event InvoiceCancelled(uint256 indexed invoiceId);

    constructor(LoopPayRegistry r, ILoopPayRewards rw) {
        registry = r;
        rewards = rw;
    }
    modifier live() {
        if (registry.paused()) revert Paused();
        _;
    }

    /// @notice Hash order references to avoid publishing customer or order details on-chain.
    function createInvoice(
        uint256 merchantId,
        address token,
        uint256 amount,
        bytes32 orderReferenceHash,
        uint64 expiresAt,
        uint256 campaignId
    ) public live returns (uint256 id) {
        registry.requireOwner(merchantId, msg.sender);
        if (amount == 0) revert InvalidAmount();
        if (!registry.approvedTokens(token)) revert UnsupportedToken();
        if (expiresAt <= block.timestamp) revert InvalidExpiry();
        if (campaignId != 0 && !rewards.validCampaign(campaignId, merchantId, token)) revert InvalidCampaign();
        id = ++invoiceCount;
        invoices[id] = Invoice(id, merchantId, token, amount, orderReferenceHash, expiresAt, campaignId, Status.Open);
        emit InvoiceCreated(id, merchantId, token, amount, orderReferenceHash, expiresAt, campaignId);
    }

    /// @notice Explicit test invoice; settles normally but never earns rewards or counts as production activity.
    function createTestInvoice(
        uint256 merchantId,
        address token,
        uint256 amount,
        bytes32 referenceHash,
        uint64 expiresAt,
        uint256 campaignId
    ) external returns (uint256 id) {
        id = createInvoice(merchantId, token, amount, referenceHash, expiresAt, campaignId);
        isTestInvoice[id] = true;
        emit InvoiceTestMarked(id);
    }

    /// @notice Payment uses the merchant's current payout address, which users should review before signing.
    function payInvoice(uint256 id) external nonReentrant live {
        Invoice storage i = invoices[id];
        if (i.invoiceId == 0) revert InvalidInvoice();
        if (i.status != Status.Open) revert NotOpen();
        if (block.timestamp >= i.expiresAt) revert Expired();
        if (!registry.approvedTokens(i.token)) revert UnsupportedToken();
        i.status = Status.Paid;
        address payout = registry.payoutOf(i.merchantId);
        IERC20(i.token).safeTransferFrom(msg.sender, payout, i.amount);
        bool testPayment = isTestInvoice[id];
        bool eligible;
        uint8 reason = testPayment ? 4 : 5;
        if (!testPayment && i.campaignId != 0) {
            (eligible, reason) = rewards.rewardEligibility(i.campaignId, msg.sender);
            rewards.earn(id, i.campaignId, i.merchantId, i.token, msg.sender, i.amount);
        }
        (address merchantOwner,,) = registry.merchants(i.merchantId);
        if (!testPayment && (msg.sender == merchantOwner || msg.sender == payout)) reason = 1;
        emit PaymentClassified(id, testPayment, eligible, reason);
        emit InvoicePaid(id, i.merchantId, msg.sender, i.token, i.amount, payout);
    }

    function cancelInvoice(uint256 id) external live {
        Invoice storage i = invoices[id];
        if (i.invoiceId == 0) revert InvalidInvoice();
        registry.requireOwner(i.merchantId, msg.sender);
        if (i.status != Status.Open) revert NotOpen();
        i.status = Status.Cancelled;
        emit InvoiceCancelled(id);
    }
}
