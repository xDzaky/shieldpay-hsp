// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IKycSBT — Interface for HashKey KYC Soulbound Token
/// @notice Checks if an address has passed KYC verification
interface IKycSBT {
    /// @notice Check if address has valid KYC SBT
    /// @param account The address to check
    /// @return True if the account is a verified human with KYC
    function isHuman(address account) external view returns (bool);
}
