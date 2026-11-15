// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {LoopPayRegistry} from "./LoopPayRegistry.sol";
import {ILoopPayRewards} from "./interfaces/ILoopPayRewards.sol";

/// @title Fully reserved, non-transferable loyalty accounting for the Loop Network.
/// @dev Only unused budget is refundable after end or permanent closure. Earned credits never expire.
contract LoopPayRewards is ReentrancyGuard, ILoopPayRewards {
    using SafeERC20 for IERC20;

    struct Campaign {
        uint256 merchantId;
        address token;
        uint256 bps;
        uint256 minPurchase;
        uint256 cap;
        uint256 budget;
        uint256 reserved;
        uint64 start;
        uint64 end;
        bool active;
    }
    enum Lifecycle {
        Draft,
        Active,
        Paused,
        Ended,
        Closed
    }
    enum Eligibility {
        Open,
        QieIdVerified,
        Disabled
    }
    mapping(uint256 => bool) public closed;
    mapping(uint256 => Eligibility) public eligibility;
    mapping(uint256 => bool) public selfPaymentProtection;
    event CampaignClosed(uint256 indexed campaignId);
    event UnreservedFundsWithdrawn(uint256 indexed campaignId, address indexed recipient, uint256 amount);
    event RewardPolicyChanged(uint256 indexed campaignId, Eligibility eligibility, bool selfPaymentProtection);
    error CampaignStillEarning();
    error CampaignIsClosed();
    error InsufficientUnreservedFunds();
    LoopPayRegistry public immutable registry;
    address public checkout;
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => bool) public partners;
    mapping(uint256 => mapping(address => uint256)) public balances;
    mapping(uint256 => mapping(address => uint256)) public lifetimeEarned;
    mapping(uint256 => bool) public invoiceEarned;
    mapping(address => mapping(bytes32 => bool)) public redemptionUsed;
    error InvalidCampaign();
    error Unauthorized();
    error InvalidAmount();
    error Paused();
    error InvalidPartner();
    error Duplicate();
    error InsufficientReward();
    error UnsupportedToken();
    event CampaignCreated(
        uint256 indexed campaignId,
        uint256 indexed merchantId,
        address token,
        uint256 bps,
        uint256 minPurchase,
        uint256 cap,
        uint64 start,
        uint64 end
    );
    event CampaignFunded(uint256 indexed campaignId, uint256 amount);
    event RewardEarned(uint256 indexed campaignId, uint256 indexed invoiceId, address indexed customer, uint256 amount);
    event PartnerOptInChanged(uint256 indexed merchantId, bool optedIn);
    event RewardRedeemed(
        uint256 indexed campaignId,
        uint256 indexed merchantId,
        address indexed customer,
        uint256 amount,
        bytes32 redemptionId
    );
    event CampaignPaused(uint256 indexed campaignId, bool paused);
    event CheckoutConfigured(address checkout);

    constructor(LoopPayRegistry r) {
        registry = r;
    }

    /// @notice One-time wiring removes any ability to replace checkout after deployment.
    function setCheckout(address value) external {
        if (
            !registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), msg.sender) || checkout != address(0)
                || value.code.length == 0
        ) {
            revert Unauthorized();
        }
        checkout = value;
        emit CheckoutConfigured(value);
    }
    modifier live() {
        if (registry.paused()) revert Paused();
        _;
    }

    function createCampaign(
        uint256 merchantId,
        address token,
        uint256 bps,
        uint256 minPurchase,
        uint256 cap,
        uint64 start,
        uint64 end
    ) public live returns (uint256 id) {
        registry.requireOwner(merchantId, msg.sender);
        if (!registry.approvedTokens(token)) revert UnsupportedToken();
        if (bps == 0 || bps > 10000 || cap == 0 || end <= start || end <= block.timestamp) revert InvalidCampaign();
        id = ++campaignCount;
        campaigns[id] = Campaign(merchantId, token, bps, minPurchase, cap, 0, 0, start, end, true);
        selfPaymentProtection[id] = true;
        emit CampaignCreated(id, merchantId, token, bps, minPurchase, cap, start, end);
    }

    /// @notice Creates the policy atomically so verified/disabled campaigns never start open.
    function createCampaignWithPolicy(
        uint256 merchantId,
        address token,
        uint256 bps,
        uint256 minPurchase,
        uint256 cap,
        uint64 start,
        uint64 end,
        Eligibility mode,
        bool protectSelfPayments
    ) external returns (uint256 id) {
        id = createCampaign(merchantId, token, bps, minPurchase, cap, start, end);
        eligibility[id] = mode;
        selfPaymentProtection[id] = protectSelfPayments;
        emit RewardPolicyChanged(id, mode, protectSelfPayments);
    }

    function validCampaign(uint256 id, uint256 merchantId, address token) external view returns (bool) {
        Campaign storage c = campaigns[id];
        return c.merchantId == merchantId && c.token == token && id != 0;
    }

    /// @notice Deposits must transfer exactly the requested amount; rebasing/taxed tokens are unsupported.
    function fundCampaign(uint256 id, uint256 amount) external nonReentrant live {
        Campaign storage c = campaigns[id];
        registry.requireOwner(c.merchantId, msg.sender);
        if (closed[id] || block.timestamp >= c.end) revert CampaignIsClosed();
        if (amount == 0) revert InvalidAmount();
        uint256 beforeBalance = IERC20(c.token).balanceOf(address(this));
        IERC20(c.token).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(c.token).balanceOf(address(this)) - beforeBalance != amount) revert UnsupportedToken();
        c.budget += amount;
        emit CampaignFunded(id, amount);
    }

    function setCampaignPaused(uint256 id, bool value) external {
        Campaign storage c = campaigns[id];
        registry.requireOwner(c.merchantId, msg.sender);
        if (closed[id] || block.timestamp >= c.end) revert CampaignIsClosed();
        c.active = !value;
        emit CampaignPaused(id, value);
    }

    /// @notice Permanently stops earning; existing customer credits remain redeemable.
    function closeCampaign(uint256 id) external {
        Campaign storage c = campaigns[id];
        registry.requireOwner(c.merchantId, msg.sender);
        if (closed[id]) revert CampaignIsClosed();
        closed[id] = true;
        c.active = false;
        emit CampaignClosed(id);
    }

    function campaignState(uint256 id) external view returns (Lifecycle) {
        Campaign storage c = campaigns[id];
        if (c.merchantId == 0) revert InvalidCampaign();
        if (closed[id]) return Lifecycle.Closed;
        if (block.timestamp >= c.end) return Lifecycle.Ended;
        if (!c.active) return Lifecycle.Paused;
        if (block.timestamp < c.start) return Lifecycle.Draft;
        return Lifecycle.Active;
    }

    /// @notice Owner refunds only budget not backing earned credits, after end or permanent close.
    /// @dev Checks-effects-interactions and reentrancy guard preserve reserved <= budget.
    /// Emergency pause does not grant operators custody or prevent merchant refunds.
    function withdrawUnreservedFunds(uint256 id, uint256 amount, address recipient) external nonReentrant {
        Campaign storage c = campaigns[id];
        registry.requireOwner(c.merchantId, msg.sender);
        if (!closed[id] && block.timestamp < c.end) revert CampaignStillEarning();
        if (amount == 0 || recipient == address(0) || recipient == address(this)) revert InvalidAmount();
        if (amount > c.budget - c.reserved) revert InsufficientUnreservedFunds();
        c.budget -= amount;
        IERC20(c.token).safeTransfer(recipient, amount);
        emit UnreservedFundsWithdrawn(id, recipient, amount);
    }

    /// @notice Merchant chooses eligibility. Verified mode fails closed until an official adapter is reviewed.
    function setRewardPolicy(uint256 id, Eligibility mode, bool protectSelfPayments) external {
        Campaign storage c = campaigns[id];
        registry.requireOwner(c.merchantId, msg.sender);
        if (closed[id] || block.timestamp >= c.end) revert CampaignIsClosed();
        eligibility[id] = mode;
        selfPaymentProtection[id] = protectSelfPayments;
        emit RewardPolicyChanged(id, mode, protectSelfPayments);
    }

    /// @return eligible Whether the wallet satisfies policy, independent of dates, cap and budget.
    /// @return reason 0 eligible, 1 self payment, 2 identity unavailable, 3 rewards disabled.
    function rewardEligibility(uint256 id, address customer) public view returns (bool eligible, uint8 reason) {
        Campaign storage c = campaigns[id];
        (address owner, address payout,) = registry.merchants(c.merchantId);
        if (selfPaymentProtection[id] && (customer == owner || customer == payout)) return (false, 1);
        if (eligibility[id] == Eligibility.QieIdVerified) return (false, 2);
        if (eligibility[id] == Eligibility.Disabled) return (false, 3);
        return (true, 0);
    }

    function optInToPartnerNetwork(uint256 merchantId, bool value) external live {
        registry.requireOwner(merchantId, msg.sender);
        partners[merchantId] = value;
        emit PartnerOptInChanged(merchantId, value);
    }

    /// @notice Exhaustion reduces earning, never blocks the underlying purchase.
    function earn(uint256 invoiceId, uint256 id, uint256 merchantId, address token, address customer, uint256 amount)
        external
        live
    {
        if (msg.sender != checkout) revert Unauthorized();
        if (invoiceEarned[invoiceId]) revert Duplicate();
        invoiceEarned[invoiceId] = true;
        Campaign storage c = campaigns[id];
        if (c.merchantId != merchantId || c.token != token || id == 0) revert InvalidCampaign();
        (bool eligible,) = rewardEligibility(id, customer);
        if (
            !eligible || closed[id] || !c.active || block.timestamp < c.start || block.timestamp >= c.end
                || amount < c.minPurchase
        ) return;
        uint256 reward = Math.min(
            Math.mulDiv(amount, c.bps, 10000), Math.min(c.cap - lifetimeEarned[id][customer], c.budget - c.reserved)
        );
        if (reward == 0) return;
        c.reserved += reward;
        balances[id][customer] += reward;
        lifetimeEarned[id][customer] += reward;
        emit RewardEarned(id, invoiceId, customer, reward);
    }

    /// @notice Customer authorizes redemption to a specific merchant; receipt IDs are customer scoped.
    /// @dev Campaign pause/end or issuer opt-out do not invalidate previously earned rewards.
    function redeem(uint256 id, uint256 recipientMerchant, uint256 amount, bytes32 redemptionId)
        external
        nonReentrant
        live
    {
        Campaign storage c = campaigns[id];
        if (!partners[recipientMerchant] || registry.payoutOf(recipientMerchant) == address(0)) {
            revert InvalidPartner();
        }
        if (amount == 0) revert InvalidAmount();
        if (redemptionUsed[msg.sender][redemptionId]) revert Duplicate();
        if (balances[id][msg.sender] < amount) revert InsufficientReward();
        redemptionUsed[msg.sender][redemptionId] = true;
        balances[id][msg.sender] -= amount;
        c.reserved -= amount;
        c.budget -= amount;
        IERC20(c.token).safeTransfer(registry.payoutOf(recipientMerchant), amount);
        emit RewardRedeemed(id, recipientMerchant, msg.sender, amount, redemptionId);
    }
}
