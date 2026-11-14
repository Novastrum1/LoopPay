// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Test} from "forge-std/Test.sol";
import {LoopPayRegistry} from "../src/LoopPayRegistry.sol";
import {LoopPayCheckout} from "../src/LoopPayCheckout.sol";
import {LoopPayRewards} from "../src/LoopPayRewards.sol";
import {MockStablecoin} from "../src/mocks/MockStablecoin.sol";

contract LoopPayTest is Test {
    LoopPayRegistry r;
    LoopPayCheckout c;
    LoopPayRewards rw;
    MockStablecoin t;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address customer = makeAddr("customer");
    address thief = makeAddr("thief");
    uint256 a;
    uint256 b;
    uint256 campaign;

    function setUp() public {
        vm.warp(1_000_000);
        r = new LoopPayRegistry(address(this));
        rw = new LoopPayRewards(r);
        c = new LoopPayCheckout(r, rw);
        rw.setCheckout(address(c));
        t = new MockStablecoin();
        r.setToken(address(t), true);
        vm.prank(alice);
        a = r.createMerchant(alice, "ipfs://alice");
        vm.prank(bob);
        b = r.createMerchant(bob, "ipfs://bob");
        vm.prank(alice);
        campaign =
            rw.createCampaign(a, address(t), 1000, 1, 100e6, uint64(block.timestamp), uint64(block.timestamp + 1 days));
        t.mint(alice, 1000e6);
        vm.startPrank(alice);
        t.approve(address(rw), type(uint256).max);
        rw.fundCampaign(campaign, 100e6);
        vm.stopPrank();
        t.mint(customer, 1e30);
        vm.prank(customer);
        t.approve(address(c), type(uint256).max);
    }

    function invoice(uint256 amount, uint256 camp) internal returns (uint256 id) {
        vm.prank(alice);
        id = c.createInvoice(a, address(t), amount, keccak256("order"), uint64(block.timestamp + 1 hours), camp);
    }

    function pay(uint256 id) internal {
        vm.prank(customer);
        c.payInvoice(id);
    }

    function testPaymentAndCrossMerchantRedemption() public {
        uint256 id = invoice(20e6, campaign);
        pay(id);
        assertEq(t.balanceOf(alice), 920e6);
        assertEq(t.balanceOf(address(c)), 0);
        assertEq(rw.balances(campaign, customer), 2e6);
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        vm.prank(alice);
        rw.setCampaignPaused(campaign, true);
        vm.prank(customer);
        rw.redeem(campaign, b, 2e6, keccak256("r1"));
        assertEq(t.balanceOf(bob), 2e6);
        assertEq(rw.balances(campaign, customer), 0);
    }

    function testDuplicatePayAndEarn() public {
        uint256 id = invoice(20e6, campaign);
        pay(id);
        vm.expectRevert(LoopPayCheckout.NotOpen.selector);
        pay(id);
        vm.expectRevert(LoopPayRewards.Duplicate.selector);
        vm.prank(address(c));
        rw.earn(id, campaign, a, address(t), customer, 20e6);
    }

    function testUnauthorizedEarnAndWiring() public {
        vm.expectRevert(LoopPayRewards.Unauthorized.selector);
        rw.earn(1, campaign, a, address(t), customer, 20e6);
        vm.expectRevert(LoopPayRewards.Unauthorized.selector);
        rw.setCheckout(address(c));
    }

    function testUnauthorizedPayoutUpdate() public {
        vm.expectRevert(LoopPayRegistry.NotOwner.selector);
        vm.prank(thief);
        r.updateMerchant(a, thief, "");
    }

    function testUpdatePayout() public {
        vm.prank(alice);
        r.updateMerchant(a, bob, "new");
        pay(invoice(1e6, 0));
        assertEq(t.balanceOf(bob), 1e6);
    }

    function testCancelAuthorization() public {
        uint256 id = invoice(1e6, 0);
        vm.expectRevert(LoopPayRegistry.NotOwner.selector);
        vm.prank(thief);
        c.cancelInvoice(id);
        vm.prank(alice);
        c.cancelInvoice(id);
        vm.expectRevert(LoopPayCheckout.NotOpen.selector);
        pay(id);
    }

    function testCannotCancelPaid() public {
        uint256 id = invoice(1e6, 0);
        pay(id);
        vm.expectRevert(LoopPayCheckout.NotOpen.selector);
        vm.prank(alice);
        c.cancelInvoice(id);
    }

    function testZeroAndUnsupported() public {
        vm.expectRevert(LoopPayCheckout.InvalidAmount.selector);
        invoice(0, 0);
        r.setToken(address(t), false);
        vm.expectRevert(LoopPayCheckout.UnsupportedToken.selector);
        invoice(1e6, 0);
    }

    function testTokenRevocationBeforePayment() public {
        uint256 id = invoice(1e6, 0);
        r.setToken(address(t), false);
        vm.expectRevert(LoopPayCheckout.UnsupportedToken.selector);
        pay(id);
    }

    function testPause() public {
        uint256 id = invoice(1e6, 0);
        r.setPaused(true);
        vm.expectRevert(LoopPayCheckout.Paused.selector);
        pay(id);
        r.setPaused(false);
        pay(id);
    }

    function testInvalidInvoiceAndCampaign() public {
        vm.expectRevert(LoopPayCheckout.InvalidInvoice.selector);
        pay(999);
        vm.expectRevert(LoopPayCheckout.InvalidCampaign.selector);
        invoice(1e6, 999);
    }

    function testCampaignDateAndMinimum() public {
        vm.prank(alice);
        uint256 cid = rw.createCampaign(
            a, address(t), 500, 10e6, 100e6, uint64(block.timestamp + 1 hours), uint64(block.timestamp + 1 days)
        );
        uint256 id = invoice(1e6, cid);
        pay(id);
        assertEq(rw.balances(cid, customer), 0);
        vm.warp(block.timestamp + 2 hours);
        pay(invoice(1e6, cid));
        assertEq(rw.balances(cid, customer), 0);
    }

    function testPausedAndEndedCampaign() public {
        vm.prank(alice);
        rw.setCampaignPaused(campaign, true);
        pay(invoice(20e6, campaign));
        assertEq(rw.balances(campaign, customer), 0);
        vm.prank(alice);
        rw.setCampaignPaused(campaign, false);
        vm.warp(block.timestamp + 2 days);
        pay(invoice(20e6, campaign));
        assertEq(rw.balances(campaign, customer), 0);
    }

    function testRedeemBeyondBudgetAndDuplicate() public {
        pay(invoice(20e6, campaign));
        vm.expectRevert(LoopPayRewards.InvalidPartner.selector);
        vm.prank(customer);
        rw.redeem(campaign, b, 1, bytes32(0));
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        vm.expectRevert(LoopPayRewards.InsufficientReward.selector);
        vm.prank(customer);
        rw.redeem(campaign, b, 3e6, bytes32(0));
        vm.prank(customer);
        rw.redeem(campaign, b, 1e6, bytes32(0));
        vm.expectRevert(LoopPayRewards.Duplicate.selector);
        vm.prank(customer);
        rw.redeem(campaign, b, 1e6, bytes32(0));
    }

    function testFuzzPayment(uint128 amount) public {
        uint256 value = bound(amount, 1, 1e24);
        uint256 before = t.balanceOf(alice);
        pay(invoice(value, 0));
        assertEq(t.balanceOf(alice), before + value);
        assertEq(t.balanceOf(address(c)), 0);
    }

    function testFuzzExpiry(uint32 delta) public {
        uint256 id = invoice(1e6, 0);
        vm.warp(block.timestamp + 3600 + uint256(delta));
        vm.expectRevert(LoopPayCheckout.Expired.selector);
        pay(id);
    }

    function testFuzzRewardBudget(uint128 amount) public {
        uint256 value = bound(amount, 1, 1e24);
        pay(invoice(value, campaign));
        (,,,,, uint256 budget, uint256 reserved,,,) = rw.campaigns(campaign);
        assertLe(reserved, budget);
        assertLe(rw.lifetimeEarned(campaign, customer), 100e6);
        assertEq(t.balanceOf(address(rw)), budget);
    }

    function testFuzzRepeatedEarning(uint128 first, uint128 second) public {
        pay(invoice(bound(first, 1, 1e24), campaign));
        pay(invoice(bound(second, 1, 1e24), campaign));
        assertLe(rw.balances(campaign, customer), 100e6);
    }

    function testRegistryGuards() public {
        vm.expectRevert(LoopPayRegistry.AlreadyRegistered.selector);
        vm.prank(alice);
        r.createMerchant(alice, "");
        vm.expectRevert(LoopPayRegistry.InvalidAddress.selector);
        vm.prank(alice);
        r.updateMerchant(a, address(0), "");
        vm.expectRevert();
        vm.prank(thief);
        r.setPaused(true);
        vm.expectRevert(LoopPayRegistry.InvalidToken.selector);
        r.setToken(thief, true);
    }

    function testCampaignGuards() public {
        vm.expectRevert(LoopPayRewards.InvalidCampaign.selector);
        vm.prank(alice);
        rw.createCampaign(a, address(t), 10001, 0, 1, 0, 1);
        vm.expectRevert(LoopPayRegistry.NotOwner.selector);
        vm.prank(thief);
        rw.fundCampaign(campaign, 1);
        vm.expectRevert(LoopPayRewards.InvalidAmount.selector);
        vm.prank(alice);
        rw.fundCampaign(campaign, 0);
    }

    function testCreationAndCancellationExpiryGuards() public {
        vm.expectRevert(LoopPayCheckout.InvalidExpiry.selector);
        vm.prank(alice);
        c.createInvoice(a, address(t), 1, bytes32(0), uint64(block.timestamp), 0);
        vm.expectRevert(LoopPayCheckout.InvalidInvoice.selector);
        c.cancelInvoice(999);
        uint256 id = invoice(1e6, 0);
        vm.prank(alice);
        c.cancelInvoice(id);
        vm.expectRevert(LoopPayCheckout.NotOpen.selector);
        vm.prank(alice);
        c.cancelInvoice(id);
    }

    function testRegistryConstructorAndCreateZero() public {
        vm.expectRevert(LoopPayRegistry.InvalidAddress.selector);
        new LoopPayRegistry(address(0));
        vm.expectRevert(LoopPayRegistry.InvalidAddress.selector);
        vm.prank(thief);
        r.createMerchant(address(0), "");
        assertEq(r.merchantOf(alice), a);
        assertEq(t.decimals(), 6);
    }

    function testRewardsPauseAndValidityGuards() public {
        assertFalse(rw.validCampaign(0, a, address(t)));
        assertFalse(rw.validCampaign(campaign, b, address(t)));
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        vm.expectRevert(LoopPayRewards.InvalidAmount.selector);
        vm.prank(customer);
        rw.redeem(campaign, b, 0, bytes32(0));
        r.setPaused(true);
        vm.expectRevert(LoopPayRewards.Paused.selector);
        vm.prank(alice);
        rw.fundCampaign(campaign, 1);
        vm.expectRevert();
        vm.prank(thief);
        r.createMerchant(thief, "");
    }

    function testEarnMismatchAndCustomerCap() public {
        vm.expectRevert(LoopPayRewards.InvalidCampaign.selector);
        vm.prank(address(c));
        rw.earn(999, campaign, b, address(t), customer, 1);
        pay(invoice(1000e6, campaign));
        assertEq(rw.balances(campaign, customer), 100e6);
        vm.prank(alice);
        rw.fundCampaign(campaign, 100e6);
        pay(invoice(1000e6, campaign));
        assertEq(rw.balances(campaign, customer), 100e6);
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        vm.prank(customer);
        rw.redeem(campaign, b, 100e6, keccak256("cap"));
        pay(invoice(1000e6, campaign));
        assertEq(rw.balances(campaign, customer), 0);
    }

    function testBudgetExhaustionAcrossCustomers() public {
        pay(invoice(1000e6, campaign));
        t.mint(thief, 1000e6);
        vm.prank(thief);
        t.approve(address(c), type(uint256).max);
        uint256 id = invoice(1000e6, campaign);
        vm.prank(thief);
        c.payInvoice(id);
        assertEq(rw.balances(campaign, thief), 0);
    }

    function testUnsupportedCampaignToken() public {
        r.setToken(address(t), false);
        vm.expectRevert(LoopPayRewards.UnsupportedToken.selector);
        vm.prank(alice);
        rw.createCampaign(a, address(t), 500, 0, 1, 0, uint64(block.timestamp + 100));
    }
}
