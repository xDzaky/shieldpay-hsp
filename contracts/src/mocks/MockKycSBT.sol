// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IKycSBT.sol";

/// @title MockKycSBT — Mock KYC Soulbound Token
///
/// ⚠️ WARNING: MOCK ONLY — MUST NOT ship in production.
/// This contract is wire-compatible with the real HashKey KYC SBT interface.
/// In production, replace this address with the actual IKycSBT deployment
/// on HashKey Chain. The isHuman() call signature is identical.
///
/// @dev Always returns true for any address. Used for hackathon demo only.
contract MockKycSBT is IKycSBT {
    /// @notice Always returns true — MOCK ONLY
    /// @dev In production, this checks the actual KYC SBT ownership on HashKey Chain
    function isHuman(address /* account */) external pure override returns (bool) {
        // ⚠️ MOCK: Returns true for all addresses
        // Real implementation checks SBT ownership via ERC-5192 (non-transferable)
        return true;
    }
}
