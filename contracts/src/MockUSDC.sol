// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockUSDC — Mock Stablecoin for Hackathon Testing
/// @notice BurnMintERC677-pattern ERC20 for CCIP Cross-Chain Token (CCT) standard
/// @dev This is a test token. DO NOT use in production.
contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "mUSDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isMinter;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MintRoleGranted(address indexed minter);
    event MintRoleRevoked(address indexed minter);

    error OnlyOwner();
    error OnlyMinter();
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyMinter() {
        if (!isMinter[msg.sender] && msg.sender != owner) revert OnlyMinter();
        _;
    }

    constructor() {
        owner = msg.sender;
        isMinter[msg.sender] = true;
    }

    // ---- ERC20 Core ----

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance();
            unchecked { allowance[from][msg.sender] = currentAllowance - amount; }
        }
        _transfer(from, to, amount);
        return true;
    }

    // ---- Mint / Burn (BurnMintERC677 pattern for CCIP CCT) ----

    /// @notice Mint tokens — only callable by minters (token pool for CCIP)
    function mint(address to, uint256 amount) external onlyMinter {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice Burn tokens from caller
    function burn(uint256 amount) external {
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        unchecked { balanceOf[msg.sender] -= amount; }
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    /// @notice Burn tokens from another address (requires allowance)
    function burnFrom(address from, uint256 amount) external {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance();
            unchecked { allowance[from][msg.sender] = currentAllowance - amount; }
        }
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked { balanceOf[from] -= amount; }
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    // ---- Minter Management ----

    function grantMintRole(address minter) external onlyOwner {
        isMinter[minter] = true;
        emit MintRoleGranted(minter);
    }

    function revokeMintRole(address minter) external onlyOwner {
        isMinter[minter] = false;
        emit MintRoleRevoked(minter);
    }

    // ---- Internal ----

    function _transfer(address from, address to, uint256 amount) internal {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked { balanceOf[from] -= amount; }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
