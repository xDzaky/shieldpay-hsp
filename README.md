# ShieldPay-HSP

Confidential Cross-Chain Settlement Bridge built for the **HashKey Chain On-Chain Horizon Hackathon 2026**.

## 🚀 Overview
ShieldPay-HSP enables confidential stablecoin transfers from any supported source chain (e.g., Base Sepolia) to HashKey Chain with **ZK-shielded transaction amounts**, compliant checkmarks powered by the **AI Capability Advisor**, and official settlement execution via the **HashKey Settlement Protocol (HSP)**.

### Key Pillars:
1. **Chainlink CCIP**: Secure cross-chain message passing and token transfers.
2. **HashKey Settlement Protocol (HSP)**: Official on-chain merchant settlement lifecycle.
3. **Zero-Knowledge Proofs (ZK)**: Noir-compiled range proofs keeping transaction amounts confidential.
4. **AI Capability Advisor**: Intelligent compliance attestation recommendations.

---

## 🛠 Project Structure
- `/contracts`: Foundry-based smart contracts (`ShieldAdapter.sol`, Mock tokens, ZK verifier).
- `/circuits`: Noir ZK circuits for range proofs.
- `/backend`: Express + TypeScript backend coordinator.
- `/frontend`: Next.js 15 + Tailwind CSS dashboard with institutional fintech styling.

---

## 💻 Local Development Setup

### 1. Prerequisite Environment Setup
Copy the example environment file and fill in your RPC URLs and private keys:
```bash
cp .env.example .env
```

### 2. Backend & Frontend Installation
```bash
# Install root/shared dependencies
npm install

# Start Backend Server
cd backend
npm install
npm run dev

# Start Frontend Server
cd ../frontend
npm install
npm run dev
```

### 3. Smart Contracts Testing
Ensure you have Foundry installed, then run the tests:
```bash
cd contracts
forge test -vvv
```

---

## 🔒 Security Note
Private keys and API configuration details are kept local in `.env` files and excluded from git tracking via `.gitignore`.
