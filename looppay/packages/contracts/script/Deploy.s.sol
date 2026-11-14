// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Script} from "forge-std/Script.sol";
import {LoopPayRegistry} from "../src/LoopPayRegistry.sol";
import {LoopPayRewards} from "../src/LoopPayRewards.sol";
import {LoopPayCheckout} from "../src/LoopPayCheckout.sol";
import {MockStablecoin} from "../src/mocks/MockStablecoin.sol";

contract Deploy is Script {
    function run() external {
        // Signing is delegated to Foundry's encrypted keystore, never vm.envUint(private key).
        address admin = vm.envAddress("DEPLOYER_ADDRESS");
        require(block.chainid == 31337 || block.chainid == 1983, "Development and testnet only");
        vm.startBroadcast(admin);
        LoopPayRegistry registry = new LoopPayRegistry(admin);
        LoopPayRewards rewards = new LoopPayRewards(registry);
        LoopPayCheckout checkout = new LoopPayCheckout(registry, rewards);
        rewards.setCheckout(address(checkout));
        address token = vm.envOr("STABLECOIN_ADDRESS", address(0));
        if (token == address(0)) token = address(new MockStablecoin());
        registry.setToken(token, true);
        vm.stopBroadcast();
    }
}
