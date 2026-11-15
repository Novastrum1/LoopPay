// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {LoopPayTest} from "./LoopPay.t.sol";
import {LoopPayRewards} from "../src/LoopPayRewards.sol";
import {LoopPayRegistry} from "../src/LoopPayRegistry.sol";

contract VaultLifecycleTest is LoopPayTest {
    function testAtomicPolicyAndLifecycle() public {
        vm.prank(alice);
        uint256 id = rw.createCampaignWithPolicy(
            a,
            address(t),
            500,
            0,
            100,
            uint64(block.timestamp + 100),
            uint64(block.timestamp + 200),
            LoopPayRewards.Eligibility.QieIdVerified,
            true
        );
        assertEq(uint256(rw.eligibility(id)), 1);
        assertTrue(rw.selfPaymentProtection(id));
        assertEq(uint256(rw.campaignState(id)), 0);
        vm.warp(block.timestamp + 100);
        assertEq(uint256(rw.campaignState(id)), 1);
        vm.prank(alice);
        rw.setCampaignPaused(id, true);
        assertEq(uint256(rw.campaignState(id)), 2);
        vm.warp(block.timestamp + 100);
        assertEq(uint256(rw.campaignState(id)), 3);
        vm.prank(alice);
        rw.closeCampaign(id);
        assertEq(uint256(rw.campaignState(id)), 4);
        vm.expectRevert(LoopPayRewards.InvalidCampaign.selector);
        rw.campaignState(999);
    }

    function testFuzzTwoCampaignIsolation(uint128 seed) public {
        vm.prank(bob);
        uint256 other =
            rw.createCampaign(b, address(t), 1000, 0, 100e6, uint64(block.timestamp), uint64(block.timestamp + 1 days));
        t.mint(bob, 50e6);
        vm.startPrank(bob);
        t.approve(address(rw), 50e6);
        rw.fundCampaign(other, 50e6);
        vm.stopPrank();
        pay(invoice(bound(seed, 1, 1e24), campaign));
        uint256 liability = rw.balances(campaign, customer);
        vm.startPrank(alice);
        rw.closeCampaign(campaign);
        if (liability < 100e6) rw.withdrawUnreservedFunds(campaign, 100e6 - liability, alice);
        vm.stopPrank();
        (,,,,, uint256 otherBudget, uint256 otherReserved,,,) = rw.campaigns(other);
        assertEq(otherBudget, 50e6);
        assertEq(otherReserved, 0);
        assertEq(t.balanceOf(address(rw)), 50e6 + liability);
    }

    function testCloseRefundKeepsLiabilitiesRedeemable() public {
        pay(invoice(20e6, campaign));
        vm.startPrank(alice);
        rw.closeCampaign(campaign);
        rw.withdrawUnreservedFunds(campaign, 98e6, alice);
        vm.expectRevert(LoopPayRewards.InsufficientUnreservedFunds.selector);
        rw.withdrawUnreservedFunds(campaign, 1, alice);
        vm.expectRevert(LoopPayRewards.CampaignIsClosed.selector);
        rw.setCampaignPaused(campaign, false);
        vm.stopPrank();
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        vm.prank(customer);
        rw.redeem(campaign, b, 2e6, keccak256("closed"));
        assertEq(t.balanceOf(address(rw)), 0);
        assertEq(t.balanceOf(bob), 2e6);
    }

    function testPauseIsNotPermanentClose() public {
        vm.startPrank(alice);
        rw.setCampaignPaused(campaign, true);
        vm.expectRevert(LoopPayRewards.CampaignStillEarning.selector);
        rw.withdrawUnreservedFunds(campaign, 1, alice);
        vm.stopPrank();
    }

    function testEndRefundAndRedemption() public {
        pay(invoice(20e6, campaign));
        vm.warp(block.timestamp + 2 days);
        vm.prank(alice);
        rw.withdrawUnreservedFunds(campaign, 98e6, alice);
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        vm.prank(customer);
        rw.redeem(campaign, b, 2e6, keccak256("ended"));
        assertEq(t.balanceOf(address(rw)), 0);
    }

    function testUnauthorizedRefundAndInvalidRecipient() public {
        vm.prank(alice);
        rw.closeCampaign(campaign);
        vm.expectRevert(LoopPayRegistry.NotOwner.selector);
        vm.prank(thief);
        rw.withdrawUnreservedFunds(campaign, 1, thief);
        vm.expectRevert(LoopPayRegistry.NotOwner.selector);
        rw.withdrawUnreservedFunds(campaign, 1, address(this));
        vm.expectRevert(LoopPayRewards.InvalidAmount.selector);
        vm.prank(alice);
        rw.withdrawUnreservedFunds(campaign, 1, address(0));
    }

    function testSelfPaymentsAndUnavailableIdentityCannotEarn() public {
        uint256 id = invoice(20e6, campaign);
        vm.startPrank(alice);
        t.approve(address(c), 20e6);
        c.payInvoice(id);
        vm.stopPrank();
        assertEq(rw.balances(campaign, alice), 0);
        vm.prank(alice);
        r.updateMerchant(a, customer, "");
        pay(invoice(20e6, campaign));
        assertEq(rw.balances(campaign, customer), 0);
        vm.startPrank(alice);
        r.updateMerchant(a, alice, "");
        rw.setRewardPolicy(campaign, LoopPayRewards.Eligibility.QieIdVerified, true);
        vm.stopPrank();
        pay(invoice(20e6, campaign));
        assertEq(rw.balances(campaign, customer), 0);
    }

    function testTestInvoicePaysWithoutRewards() public {
        vm.prank(alice);
        uint256 id = c.createTestInvoice(a, address(t), 20e6, bytes32(0), uint64(block.timestamp + 100), campaign);
        pay(id);
        assertTrue(c.isTestInvoice(id));
        assertEq(rw.balances(campaign, customer), 0);
        assertEq(t.balanceOf(alice), 920e6);
    }

    function testDisabledAndConfigurableSelfProtection() public {
        vm.prank(alice);
        rw.setRewardPolicy(campaign, LoopPayRewards.Eligibility.Disabled, true);
        pay(invoice(20e6, campaign));
        assertEq(rw.balances(campaign, customer), 0);
        vm.prank(alice);
        rw.setRewardPolicy(campaign, LoopPayRewards.Eligibility.Open, false);
        uint256 id = invoice(20e6, campaign);
        vm.startPrank(alice);
        t.approve(address(c), 20e6);
        c.payInvoice(id);
        vm.stopPrank();
        assertEq(rw.balances(campaign, alice), 2e6);
    }

    function testFuzzConservationAfterRefund(uint128 purchase, uint128 refundSeed, uint128 redeemSeed) public {
        pay(invoice(bound(purchase, 1, 1e24), campaign));
        uint256 liability = rw.balances(campaign, customer);
        uint256 refund = bound(refundSeed, 0, 100e6 - liability);
        vm.startPrank(alice);
        rw.closeCampaign(campaign);
        if (refund > 0) rw.withdrawUnreservedFunds(campaign, refund, alice);
        vm.stopPrank();
        vm.prank(bob);
        rw.optInToPartnerNetwork(b, true);
        uint256 redemption = bound(redeemSeed, 0, liability);
        if (redemption > 0) {
            vm.prank(customer);
            rw.redeem(campaign, b, redemption, keccak256("fuzz"));
        }
        (,,,,, uint256 budget, uint256 reserved,,,) = rw.campaigns(campaign);
        assertEq(budget + refund + redemption, 100e6);
        assertEq(reserved, liability - redemption);
        assertLe(reserved, budget);
        assertEq(t.balanceOf(address(rw)), budget);
    }
}
