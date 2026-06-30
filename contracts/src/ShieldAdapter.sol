// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IZKVerifier.sol";

/// @title ShieldAdapter — Confidential Cross-Chain Settlement Adapter
/// @notice Receives CCIP messages, verifies ZK proofs, and emits settlement observations
/// @dev Implements the HSP @hsp/devkit adapter pattern: "the verifier never changes; only your proof schema does"
/// @dev Zero-custody: this contract NEVER holds user funds. Only observes and verifies.
contract ShieldAdapter {
    // ============================================================
    //                         ERRORS
    // ============================================================

    error OnlyOwner();
    error OnlyRouter();
    error SourceChainNotAllowlisted(uint64 sourceChainSelector);
    error SenderNotAllowlisted(address sender);
    error PaymentAlreadyProcessed(bytes32 paymentId);
    error CCIPMessageAlreadyUsed(bytes32 messageId);
    error ZKProofVerificationFailed();
    error MandateDeadlineExceeded(uint256 deadline, uint256 currentTime);
    error InvalidMandateSignature();

    // ============================================================
    //                         EVENTS
    // ============================================================

    /// @notice Emitted when a valid cross-chain settlement is observed
    /// @dev This event is the "observation" that HSP Coordinator watches for
    event SettlementObserved(
        bytes32 indexed paymentId,
        bytes32 amountCommitment,
        address indexed payer,
        uint64 sourceChainSelector,
        bytes32 ccipMessageId
    );

    /// @notice Emitted when a source chain is allowlisted/delisted
    event SourceChainAllowlisted(uint64 indexed chainSelector, bool allowed);

    /// @notice Emitted when a sender is allowlisted/delisted
    event SenderAllowlisted(address indexed sender, bool allowed);

    /// @notice Emitted when the ZK verifier is updated
    event ZKVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    // ============================================================
    //                     STATE VARIABLES
    // ============================================================

    /// @notice The CCIP Router address (immutable for security)
    address public immutable i_ccipRouter;

    /// @notice Contract owner
    address public owner;

    /// @notice ZK proof verifier contract
    IZKVerifier public zkVerifier;

    /// @notice Tracks processed payments to prevent replay attacks
    mapping(bytes32 => bool) public processedPayments;

    /// @notice Tracks processed CCIP messages to prevent observation reuse
    mapping(bytes32 => bool) public processedCCIPMessages;

    /// @notice Allowlisted source chain selectors
    mapping(uint64 => bool) public allowlistedSourceChains;

    /// @notice Allowlisted sender addresses on source chains
    mapping(address => bool) public allowlistedSenders;

    // ============================================================
    //                       MODIFIERS
    // ============================================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyRouter() {
        if (msg.sender != i_ccipRouter) revert OnlyRouter();
        _;
    }

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /// @notice Deploy ShieldAdapter
    /// @param _router The CCIP Router address on HashKey Chain
    /// @param _zkVerifier The ZK proof verifier contract address
    constructor(address _router, address _zkVerifier) {
        i_ccipRouter = _router;
        zkVerifier = IZKVerifier(_zkVerifier);
        owner = msg.sender;
    }

    // ============================================================
    //                   OWNER FUNCTIONS
    // ============================================================

    /// @notice Allowlist or delist a source chain
    function allowlistSourceChain(uint64 _chainSelector, bool _allowed) external onlyOwner {
        allowlistedSourceChains[_chainSelector] = _allowed;
        emit SourceChainAllowlisted(_chainSelector, _allowed);
    }

    /// @notice Allowlist or delist a sender address
    function allowlistSender(address _sender, bool _allowed) external onlyOwner {
        allowlistedSenders[_sender] = _allowed;
        emit SenderAllowlisted(_sender, _allowed);
    }

    /// @notice Update the ZK verifier contract
    function setZkVerifier(address _newVerifier) external onlyOwner {
        address old = address(zkVerifier);
        zkVerifier = IZKVerifier(_newVerifier);
        emit ZKVerifierUpdated(old, _newVerifier);
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    // ============================================================
    //                   CCIP RECEIVE
    // ============================================================

    /// @notice Handle incoming CCIP message
    /// @dev Called by CCIP Router only. Validates all security checks before emitting observation.
    /// @param messageId Unique CCIP message identifier
    /// @param sourceChainSelector Chain selector of the source chain
    /// @param sender Address of the sender on source chain
    /// @param data Encoded payload: (bytes signedMandate, bytes32 amountCommitment, bytes zkProof, bytes32[] publicInputs, uint256 deadline)
    function ccipReceive(
        bytes32 messageId,
        uint64 sourceChainSelector,
        address sender,
        bytes calldata data
    ) external onlyRouter {
        // Security: validate source chain
        if (!allowlistedSourceChains[sourceChainSelector]) {
            revert SourceChainNotAllowlisted(sourceChainSelector);
        }

        // Security: validate sender
        if (!allowlistedSenders[sender]) {
            revert SenderNotAllowlisted(sender);
        }

        _processMessage(messageId, sourceChainSelector, data);
    }

    // ============================================================
    //                  INTERNAL LOGIC
    // ============================================================

    function _processMessage(
        bytes32 messageId,
        uint64 sourceChainSelector,
        bytes calldata data
    ) internal {
        // Decode payload
        (
            bytes memory signedMandate,
            bytes32 amountCommitment,
            bytes memory zkProof,
            bytes32[] memory publicInputs,
            uint256 deadline
        ) = abi.decode(data, (bytes, bytes32, bytes, bytes32[], uint256));

        // Compute paymentId from mandate hash
        bytes32 paymentId = keccak256(signedMandate);

        // CONFORMANCE: Reject replay — same paymentId must not be processed twice
        if (processedPayments[paymentId]) {
            revert PaymentAlreadyProcessed(paymentId);
        }

        // CONFORMANCE: Reject observation reuse — same CCIP message must not be used twice
        if (processedCCIPMessages[messageId]) {
            revert CCIPMessageAlreadyUsed(messageId);
        }

        // CONFORMANCE: Reject expired deadline
        if (block.timestamp > deadline) {
            revert MandateDeadlineExceeded(deadline, block.timestamp);
        }

        // Verify ZK proof on-chain
        if (!zkVerifier.verify(zkProof, publicInputs)) {
            revert ZKProofVerificationFailed();
        }

        // Extract payer from signed mandate (simplified: first 20 bytes after signature)
        // In production: full EIP-712 recovery
        address payer = _extractPayer(signedMandate);

        // Mark as processed (checks-effects-interactions pattern)
        processedPayments[paymentId] = true;
        processedCCIPMessages[messageId] = true;

        // Emit the observation event that HSP Coordinator watches for
        emit SettlementObserved(
            paymentId,
            amountCommitment,
            payer,
            sourceChainSelector,
            messageId
        );
    }

    /// @notice Extract payer address from signed mandate
    /// @dev Simplified extraction — in production, use full EIP-712 ecrecover
    function _extractPayer(bytes memory signedMandate) internal pure returns (address) {
        if (signedMandate.length < 20) revert InvalidMandateSignature();
        address payer;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            payer := mload(add(signedMandate, 20))
        }
        return payer;
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /// @notice Check if a payment has been processed
    function isPaymentProcessed(bytes32 paymentId) external view returns (bool) {
        return processedPayments[paymentId];
    }

    /// @notice Check if a CCIP message has been used
    function isCCIPMessageUsed(bytes32 messageId) external view returns (bool) {
        return processedCCIPMessages[messageId];
    }

    /// @notice ERC-165 interface support
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IZKVerifier).interfaceId || interfaceId == 0x01ffc9a7; // ERC165
    }
}
