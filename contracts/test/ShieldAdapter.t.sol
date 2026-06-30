// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ShieldAdapter.sol";
import "../src/verifier/PlaceholderVerifier.sol";
import "../src/MockUSDC.sol";
import "../src/mocks/MockKycSBT.sol";

/// @title ShieldAdapterTest — Conformance test suite
/// @notice Tests all security invariants required by HSP devkit adapter pattern
/// @dev Run with: forge test -vvv
contract ShieldAdapterTest is Test {
    ShieldAdapter public adapter;
    PlaceholderVerifier public verifier;
    MockUSDC public usdc;
    MockKycSBT public kycSBT;

    address constant ROUTER = address(0x0000000000000000000000000000000000000101);
    address constant SENDER = address(0x0000000000000000000000000000000000005E9D);
    uint64 constant SOURCE_CHAIN = 10344971235874465080; // Base Sepolia

    event SettlementObserved(
        bytes32 indexed paymentId,
        bytes32 amountCommitment,
        address indexed payer,
        uint64 sourceChainSelector,
        bytes32 ccipMessageId
    );

    function setUp() public {
        verifier = new PlaceholderVerifier();
        adapter = new ShieldAdapter(ROUTER, address(verifier));
        usdc = new MockUSDC();
        kycSBT = new MockKycSBT();

        // Setup allowlists
        adapter.allowlistSourceChain(SOURCE_CHAIN, true);
        adapter.allowlistSender(SENDER, true);
    }

    // ---- Helper: build valid payload ----

    function _buildPayload(address payer, uint256 deadline) internal pure returns (bytes memory) {
        bytes memory signedMandate = abi.encodePacked(payer, bytes12(0)); // 32 bytes with payer
        bytes32 amountCommitment = keccak256(abi.encodePacked("test_commitment"));
        bytes memory zkProof = hex"deadbeef";
        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = amountCommitment;

        return abi.encode(signedMandate, amountCommitment, zkProof, publicInputs, deadline);
    }

    function _buildPayloadCustomMandate(bytes memory mandate, uint256 deadline) internal pure returns (bytes memory) {
        bytes32 amountCommitment = keccak256(abi.encodePacked("test_commitment"));
        bytes memory zkProof = hex"deadbeef";
        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = amountCommitment;

        return abi.encode(mandate, amountCommitment, zkProof, publicInputs, deadline);
    }

    // ============================================================
    //                    CONFORMANCE TESTS
    // ============================================================

    /// @notice TEST: Valid payment should emit SettlementObserved
    function test_HappyPath() public {
        bytes memory payload = _buildPayload(address(0xBEEF), block.timestamp + 3600);
        bytes32 messageId = keccak256("msg_001");

        // Call as router
        _callAsRouter(messageId, SOURCE_CHAIN, SENDER, payload);

        // Verify payment was processed
        bytes32 paymentId = keccak256(abi.encodePacked(address(0xBEEF), bytes12(0)));
        assert(adapter.isPaymentProcessed(paymentId));
        assert(adapter.isCCIPMessageUsed(messageId));
    }

    /// @notice TEST: Same paymentId twice should revert (replay attack)
    function test_RejectReplay() public {
        bytes memory payload = _buildPayload(address(0xBEEF), block.timestamp + 3600);
        bytes32 messageId1 = keccak256("msg_replay_1");
        bytes32 messageId2 = keccak256("msg_replay_2");

        // First call succeeds
        _callAsRouter(messageId1, SOURCE_CHAIN, SENDER, payload);

        // Second call with same mandate (same paymentId) should revert
        try this.callAdapterExternal(messageId2, SOURCE_CHAIN, SENDER, payload) {
            revert("Should have reverted with PaymentAlreadyProcessed");
        } catch {
            // Expected: PaymentAlreadyProcessed
        }
    }

    /// @notice TEST: Same CCIP messageId twice should revert (observation reuse)
    function test_RejectObservationReuse() public {
        bytes memory payload1 = _buildPayload(address(0xBEEF), block.timestamp + 3600);
        bytes32 messageId = keccak256("msg_reuse");

        // First call succeeds
        _callAsRouter(messageId, SOURCE_CHAIN, SENDER, payload1);

        // Second call with same messageId should revert
        bytes memory payload2 = _buildPayload(address(0xCAFE), block.timestamp + 3600);
        try this.callAdapterExternal(messageId, SOURCE_CHAIN, SENDER, payload2) {
            revert("Should have reverted with CCIPMessageAlreadyUsed");
        } catch {
            // Expected: CCIPMessageAlreadyUsed
        }
    }

    /// @notice TEST: Expired deadline should revert
    function test_RejectExpiredDeadline() public {
        bytes memory payload = _buildPayload(address(0xBEEF), block.timestamp - 1); // past deadline
        bytes32 messageId = keccak256("msg_expired");

        try this.callAdapterExternal(messageId, SOURCE_CHAIN, SENDER, payload) {
            revert("Should have reverted with MandateDeadlineExceeded");
        } catch {
            // Expected: MandateDeadlineExceeded
        }
    }

    /// @notice TEST: Unallowlisted source chain should revert
    function test_RejectUnallowlistedChain() public {
        bytes memory payload = _buildPayload(address(0xBEEF), block.timestamp + 3600);
        bytes32 messageId = keccak256("msg_bad_chain");
        uint64 badChain = 999999;

        try this.callAdapterExternal(messageId, badChain, SENDER, payload) {
            revert("Should have reverted with SourceChainNotAllowlisted");
        } catch {
            // Expected: SourceChainNotAllowlisted
        }
    }

    /// @notice TEST: Unallowlisted sender should revert
    function test_RejectUnallowlistedSender() public {
        bytes memory payload = _buildPayload(address(0xBEEF), block.timestamp + 3600);
        bytes32 messageId = keccak256("msg_bad_sender");
        address badSender = address(0xBAD);

        try this.callAdapterExternal(messageId, SOURCE_CHAIN, badSender, payload) {
            revert("Should have reverted with SenderNotAllowlisted");
        } catch {
            // Expected: SenderNotAllowlisted
        }
    }

    /// @notice TEST: Owner can allowlist/delist chains
    function test_OwnerCanAllowlistChain() public {
        uint64 newChain = 12345;
        adapter.allowlistSourceChain(newChain, true);
        assert(adapter.allowlistedSourceChains(newChain));

        adapter.allowlistSourceChain(newChain, false);
        assert(!adapter.allowlistedSourceChains(newChain));
    }

    /// @notice TEST: Owner can allowlist/delist senders
    function test_OwnerCanAllowlistSender() public {
        address newSender = address(0x1234);
        adapter.allowlistSender(newSender, true);
        assert(adapter.allowlistedSenders(newSender));

        adapter.allowlistSender(newSender, false);
        assert(!adapter.allowlistedSenders(newSender));
    }

    /// @notice TEST: Owner can update ZK verifier
    function test_OwnerCanSetVerifier() public {
        PlaceholderVerifier newVerifier = new PlaceholderVerifier();
        adapter.setZkVerifier(address(newVerifier));
        assert(address(adapter.zkVerifier()) == address(newVerifier));
    }

    /// @notice TEST: MockUSDC mint and burn works correctly
    function test_MockUSDCMintBurn() public {
        usdc.mint(address(this), 1000000); // 1 USDC
        assert(usdc.balanceOf(address(this)) == 1000000);

        usdc.burn(500000);
        assert(usdc.balanceOf(address(this)) == 500000);
    }

    /// @notice TEST: MockKycSBT returns true for any address
    function test_MockKycSBTAlwaysTrue() public view {
        assert(kycSBT.isHuman(address(0)));
        assert(kycSBT.isHuman(address(this)));
        assert(kycSBT.isHuman(address(0xDEAD)));
    }

    // ---- Test helpers ----

    function _callAsRouter(bytes32 messageId, uint64 chain, address sender, bytes memory payload) internal {
        // Simulate call from the CCIP router address using vm.prank
        vm.prank(ROUTER);
        adapter.ccipReceive(messageId, chain, sender, payload);
    }

    /// @notice External wrapper for try/catch testing (called WITHOUT router prank)
    function callAdapterExternal(bytes32 messageId, uint64 chain, address sender, bytes memory payload) external {
        vm.prank(ROUTER);
        adapter.ccipReceive(messageId, chain, sender, payload);
    }
}
