// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {LoopPayRegistry} from "../src/LoopPayRegistry.sol";
import {LoopPayRewards} from "../src/LoopPayRewards.sol";
import {LoopPayCheckout} from "../src/LoopPayCheckout.sol";

contract CallbackToken is ERC20 {
    address target;
    bytes payload;
    bool public blocked;

    constructor() ERC20("Attack", "ATK") {
        _mint(msg.sender, 1e24);
    }

    function arm(address t, bytes memory p) external {
        target = t;
        payload = p;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (target != address(0)) {
            address saved = target;
            target = address(0);
            (bool ok,) = saved.call(payload);
            blocked = !ok;
        }
        super._update(from, to, value);
    }
}

contract ReentrancyTest is Test {
    function testReentrantPaymentBlocked() public {
        LoopPayRegistry r = new LoopPayRegistry(address(this));
        LoopPayRewards rw = new LoopPayRewards(r);
        LoopPayCheckout c = new LoopPayCheckout(r, rw);
        rw.setCheckout(address(c));
        CallbackToken t = new CallbackToken();
        r.setToken(address(t), true);
        uint256 m = r.createMerchant(address(123), "");
        uint256 i = c.createInvoice(m, address(t), 100, bytes32(0), uint64(block.timestamp + 100), 0);
        t.approve(address(c), 100);
        t.arm(address(c), abi.encodeCall(c.payInvoice, (i)));
        c.payInvoice(i);
        assertTrue(t.blocked());
        assertEq(t.balanceOf(address(123)), 100);
    }

    function testReentrantRedemptionBlocked() public {
        LoopPayRegistry r = new LoopPayRegistry(address(this));
        LoopPayRewards rw = new LoopPayRewards(r);
        LoopPayCheckout c = new LoopPayCheckout(r, rw);
        rw.setCheckout(address(c));
        CallbackToken t = new CallbackToken();
        r.setToken(address(t), true);
        uint256 m = r.createMerchant(address(123), "");
        uint256 cid =
            rw.createCampaign(m, address(t), 10000, 0, 10000, uint64(block.timestamp), uint64(block.timestamp + 100));
        t.approve(address(rw), 1000);
        rw.fundCampaign(cid, 1000);
        uint256 i = c.createInvoice(m, address(t), 100, bytes32(0), uint64(block.timestamp + 100), cid);
        t.approve(address(c), 100);
        c.payInvoice(i);
        rw.optInToPartnerNetwork(m, true);
        t.arm(address(rw), abi.encodeCall(rw.redeem, (cid, m, 100, bytes32(uint256(2)))));
        rw.redeem(cid, m, 100, bytes32(uint256(1)));
        assertTrue(t.blocked());
        assertEq(rw.balances(cid, address(this)), 0);
    }
}

/// @dev Models an incorrectly allowlisted fee-on-transfer token.
contract TaxedToken is ERC20 {
    constructor() ERC20("Taxed test token", "TAX") {
        _mint(msg.sender, 1000);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && value > 0) {
            super._update(from, to, value - 1);
            super._update(from, address(0), 1);
        } else {
            super._update(from, to, value);
        }
    }
}

contract FundingSemanticsTest is Test {
    function testFeeOnTransferFundingCannotCreateUnbackedBudget() public {
        LoopPayRegistry registry = new LoopPayRegistry(address(this));
        LoopPayRewards rewards = new LoopPayRewards(registry);
        TaxedToken token = new TaxedToken();
        registry.setToken(address(token), true);
        uint256 merchant = registry.createMerchant(address(this), "");
        uint256 campaign = rewards.createCampaign(
            merchant, address(token), 500, 0, 100, uint64(block.timestamp), uint64(block.timestamp + 100)
        );
        token.approve(address(rewards), 100);
        vm.expectRevert(LoopPayRewards.UnsupportedToken.selector);
        rewards.fundCampaign(campaign, 100);
        assertEq(token.balanceOf(address(rewards)), 0);
        (,,,,, uint256 budget, uint256 reserved,,,) = rewards.campaigns(campaign);
        assertEq(budget, 0);
        assertEq(reserved, 0);
    }
}
