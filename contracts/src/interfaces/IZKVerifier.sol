// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IZKVerifier — Interface for ZK proof verification
/// @notice Used by ShieldAdapter to verify range proofs on-chain
interface IZKVerifier {
    /// @notice Verify a ZK proof against public inputs
    /// @param proof The serialized proof bytes
    /// @param publicInputs Array of public input values (bytes32)
    /// @return valid True if the proof is valid
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool valid);
}
