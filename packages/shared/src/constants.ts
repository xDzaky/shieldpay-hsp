// ============================================================
// ShieldPay-HSP — Chain Constants & Contract Addresses
// ============================================================

/** Supported source chains for CCIP */
export const SOURCE_CHAINS = {
  BASE_SEPOLIA: {
    name: 'Base Sepolia',
    chainId: 84532,
    selector: '10344971235874465080',
    rpcEnvKey: 'BASE_SEPOLIA_RPC_URL',
    explorerUrl: 'https://sepolia.basescan.org',
  },
  ARBITRUM_SEPOLIA: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    selector: '3478487238524512106',
    rpcEnvKey: 'ARBITRUM_SEPOLIA_RPC_URL',
    explorerUrl: 'https://sepolia.arbiscan.io',
  },
  ETHEREUM_SEPOLIA: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    selector: '16015286601757825753',
    rpcEnvKey: 'ETHEREUM_SEPOLIA_RPC_URL',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  BNB_TESTNET: {
    name: 'BNB Chain Testnet',
    chainId: 97,
    selector: '13264668187771770619',
    rpcEnvKey: 'BNB_TESTNET_RPC_URL',
    explorerUrl: 'https://testnet.bscscan.com',
  },
  OP_SEPOLIA: {
    name: 'OP Sepolia',
    chainId: 11155420,
    selector: '5224473277236331295',
    rpcEnvKey: 'OP_SEPOLIA_RPC_URL',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
  },
} as const;

/** HashKey Chain Testnet (destination) */
export const HASHKEY_CHAIN = {
  name: 'HashKey Chain Testnet',
  chainId: 133,
  selector: '4356164186791070119',
  rpcUrl: 'https://testnet.hsk.xyz',
  rpcUrlAlt: 'https://hashkeychain-testnet.alt.technology',
  explorerUrl: 'https://hashkeychain-testnet-explorer.alt.technology',
  faucetUrl: 'https://faucet.hsk.xyz/faucet',
} as const;

/** Chainlink CCIP addresses on HashKey Chain Testnet */
export const CCIP_HASHKEY = {
  router: '0x1360c71dd2458B6d4A5Ad5946d9011BafA0435d7',
  rmn: '0x9BbBb1Df7D813c9749d99D3CC3D8087b06A83984',
  tokenAdminRegistry: '0x732cC8266993dDfc5a91035EBe7afF301Be4e8c3',
  registryModuleOwner: '0x99653DD5e0a6b655aD82e7F41a816CA666F51AFF',
  tokenPoolFactory: '0x0ED0EEb9b71778C2b826f37D35c4Be91D2741F33',
  linkToken: '0x8418c4d7e8e17ab90232DC72150730E6c4b84F57',
  whsk: '0x2896e619Fa7c831A7E52b87EffF4d671bEc6B262',
} as const;

/** CCIP Explorer base URL */
export const CCIP_EXPLORER_URL = 'https://ccip.chain.link';

/** Payment status display config */
export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  DRAFT: { label: 'Draft', color: '#6B7280', icon: '📝' },
  CCIP_PENDING: { label: 'CCIP Pending', color: '#F59E0B', icon: '⏳' },
  CCIP_DELIVERED: { label: 'CCIP Delivered', color: '#3B82F6', icon: '📨' },
  HSP_PROPOSED: { label: 'HSP Proposed', color: '#8B5CF6', icon: '📋' },
  HSP_OBSERVED: { label: 'HSP Observed', color: '#06B6D4', icon: '👁️' },
  HSP_SETTLED: { label: 'Settled', color: '#10B981', icon: '✅' },
  FAILED: { label: 'Failed', color: '#EF4444', icon: '❌' },
};

/** AI Advisor disclaimer — MUST be shown in UI (spec requirement) */
export const AI_DISCLAIMER =
  'AI recommendation is advisory only. Final settlement decision is made exclusively by HSP\'s cryptographic verifier (requiredCapabilities ⊆ satisfiedCapabilities). The AI never signs, never holds funds, never overrides the verifier.';

/** Version string for health endpoint */
export const VERSION = '1.0.0';
