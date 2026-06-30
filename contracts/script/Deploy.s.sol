// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/ShieldAdapter.sol";
import "../src/MockUSDC.sol";
import "../src/verifier/PlaceholderVerifier.sol";
import "../src/mocks/MockKycSBT.sol";

/// @title Deploy — Deployment script for ShieldPay-HSP contracts
/// @notice Deploy all contracts to HashKey Chain Testnet
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url hashkey_testnet --broadcast
contract Deploy {
    function run() external {
        // Deploy ZK Verifier (placeholder for now)
        PlaceholderVerifier verifier = new PlaceholderVerifier();

        // Deploy ShieldAdapter with CCIP Router and ZK Verifier
        address ccipRouter = 0x1360c71dd2458B6d4A5Ad5946d9011BafA0435d7; // HashKey Testnet Router
        ShieldAdapter adapter = new ShieldAdapter(ccipRouter, address(verifier));

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();

        // Deploy MockKycSBT
        MockKycSBT kycSBT = new MockKycSBT();

        // Setup allowlists — Base Sepolia as primary source chain
        adapter.allowlistSourceChain(10344971235874465080, true); // Base Sepolia
        adapter.allowlistSourceChain(3478487238524512106, true);  // Arbitrum Sepolia
        adapter.allowlistSourceChain(16015286601757825753, true); // Ethereum Sepolia
        adapter.allowlistSourceChain(13264668187771770619, true); // BNB Testnet
        adapter.allowlistSourceChain(5224473277236331295, true);  // OP Sepolia

        // Mint initial supply of MockUSDC for testing
        usdc.mint(msg.sender, 1_000_000 * 10 ** 6); // 1M mUSDC

        // Log deployed addresses
        _log("PlaceholderVerifier", address(verifier));
        _log("ShieldAdapter", address(adapter));
        _log("MockUSDC", address(usdc));
        _log("MockKycSBT", address(kycSBT));
    }

    function _log(string memory name, address addr) internal pure {
        // In Foundry scripts, use console.log — simplified here
        // console.log(name, addr);
        bytes memory _name = bytes(name);
        bytes memory _addr = abi.encodePacked(addr);
        // Addresses will be logged in broadcast output
        assembly {
            let nameLen := mload(_name)
            let addrLen := mload(_addr)
            // Suppress unused variable warnings
            pop(nameLen)
            pop(addrLen)
        }
    }
}
