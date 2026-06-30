# PROJECT BRIEF — UNTUK CLAUDE OPUS 4.6 (ROLE: LEAD DEVELOPER)

## CARA MEMBACA DOKUMEN INI

Kamu berperan sebagai lead developer yang membangun submission untuk **HashKey Chain On-Chain Horizon Hackathon (Japan edition)**, dorahacks.io/hackathon/hskchainjapan, deadline submission **11 Juli 2026, 23:59 GMT+8**. Target: **Juara 1 di track DeFi** (dan berpotensi cross-listing ke track AI karena salah satu komponen adalah AI agent).

Dokumen ini adalah tech spec lengkap, bukan brainstorming. Semua keputusan arsitektur sudah final berdasarkan riset mendalam terhadap dokumentasi resmi HSP, dokumentasi Chainlink CCIP, dan analisis pemenang edisi hackathon sebelumnya (Maret–April 2026, 468 pendaftar, 166 project, prize pool 40.000 USDT). Tugasmu adalah **mengeksekusi**, bukan mendesain ulang ide. Jika menemukan kendala teknis di tengah jalan, sesuaikan implementasi tapi pertahankan prinsip arsitektur inti yang dijelaskan di bawah.

Ikuti instruksi build secara berurutan sesuai **Speedrun Protocol** di bagian akhir dokumen ini.

---

## 1. RINGKASAN EKSEKUTIF

**Nama project**: ShieldPay-HSP (working title — boleh diganti jika ditemukan nama lebih baik, tapi pertahankan makna "confidential cross-chain settlement bridge")

**Satu kalimat pitch**: Adapter yang menyambungkan likuiditas stablecoin lintas-chain (Base, Arbitrum, Ethereum, BNB Chain, OP — via Chainlink CCIP) langsung ke settlement HSP (HashKey Settlement Protocol) di HashKey Chain, dengan jumlah transaksi disembunyikan dari publik (ZK shielded amount) namun tetap menghasilkan bukti solvency dan compliance yang dapat diverifikasi siapa pun — direplikasi dari pola Delivery-vs-Payment institusional yang telah dibuktikan ANZ Bank lewat Chainlink CCIP Private Transactions (Project Guardian), namun di sini dibangun sebagai infrastruktur terbuka pertama di ekosistem HashKey Chain yang menyatukan CCIP dengan HSP.

**Mengapa ide ini dipilih (ringkas, untuk konteksmu)**:
- HSP saat ini HANYA bisa menerima settlement dari wallet yang SUDAH punya stablecoin di HashKey Chain — gap nyata untuk institusi yang likuiditasnya tersebar di chain lain.
- Dokumentasi resmi HSP secara eksplisit menyatakan "private payments" (shielded amount + view-key disclosure) sebagai roadmap "coming soon" dan menyediakan slot resmi untuk adapter kustom lewat `@hsp/devkit` — kita mengisi slot ini.
- HashKey Chain adalah satu dari hanya 15 blockchain yang sudah diadopsi CCIP sebagai infrastruktur cross-chain kanonik mereka (sejajar Coinbase Base) — investasi strategis yang BELUM dimanfaatkan satu pun submission di edisi hackathon sebelumnya (166 project, NOL yang menyentuh CCIP).
- Tiga pemenang track ZKID edisi sebelumnya (FairDrop, ZKGate, HSK-PASSPORT) semuanya bertema "buktikan atribut sensitif tanpa membukanya" — mengonfirmasi juri menghargai pola ini.
- Pemenang track PayFi (hashpay) membangun "di atas" primitif HSP (HSP settlement + EAS attestations) secara struktural, bukan sekadar memanggil SDK — pola ini yang kita replikasi tapi dengan dimensi baru (cross-chain).

**CATATAN PENTING UNTUK KAMU**: HSP adalah protokol PRE-1.0 DRAFT milik organizer hackathon ini, BUKAN library publik yang ada di npm. Detail SDK di bawah ini disusun berdasarkan dokumentasi developer portal HSP (`GET /docs` di Coordinator) dan README GitHub `project-hsp/hsp`. Saat development dimulai, **WAJIB** baca ulang dokumentasi live di `https://hsp-hackathon.hashkeymerchant.com/docs` dan repo `https://github.com/project-hsp/hsp` (terutama `docs/guide.md` dan `packages/devkit/README.md`) karena wire format bisa berubah (disclaimer resmi: "draft protocol · pre-1.0 · wire format may change"). Jangan asumsikan API persis sama seperti di spec ini tanpa verifikasi langsung ke source terbaru.

---

## 2. KONFIRMASI FEASIBILITY TEKNIS (sudah diverifikasi, JANGAN ulangi riset ini)

### 2.1 HashKey Chain Testnet
- Chain ID: **133**
- RPC: `https://testnet.hsk.xyz` (alternatif: `https://hashkeychain-testnet.alt.technology`)
- Block explorer: `https://hashkeychain-testnet-explorer.alt.technology` (atau `explorer.hsk.xyz`)
- Native gas token: HSK
- Faucet: `https://faucet.hsk.xyz/faucet` atau `https://hsk.xyz/faucet` (rate limit 1 HSK/24 jam — minta lebih awal karena bisa jadi bottleneck waktu)

### 2.2 Chainlink CCIP — HashKey Chain Testnet (TERVERIFIKASI AKTIF)
- Router address: `0x1360c71dd2458B6d4A5Ad5946d9011BafA0435d7`
- Chain selector: `4356164186791070119`
- RMN (Risk Management Network): `0x9BbBb1Df7D813c9749d99D3CC3D8087b06A83984`
- Token Admin Registry: `0x732cC8266993dDfc5a91035EBe7afF301Be4e8c3`
- Registry Module Owner: `0x99653DD5e0a6b655aD82e7F41a816CA666F51AFF`
- Token Pool Factory: `0x0ED0EEb9b71778C2b826f37D35c4Be91D2741F33`
- Fee token LINK: `0x8418c4d7e8e17ab90232DC72150730E6c4b84F57`
- Fee token WHSK: `0x2896e619Fa7c831A7E52b87EffF4d671bEc6B262`
- **5 outbound lanes aktif (versi router 1.5.0)**: Arbitrum Sepolia, Base Sepolia, BNB Chain Testnet, Ethereum Sepolia, OP Sepolia
- Environment variable resmi di Chainlink starter kit: `HASHKEY_SEPOLIA_RPC_URL`

**Implikasi penting**: belum ada stablecoin (USDC) yang terdaftar resmi di Token Admin Registry HashKey testnet (baru 1 token terdaftar, kemungkinan WHSK). **Strategi**: deploy MOCK USDC sendiri sebagai Cross-Chain Token (CCT) menggunakan `BurnMintERC677` standar Chainlink — ini bisa dilakukan self-serve dalam hitungan menit tanpa approval pihak ketiga, didukung penuh oleh CCIP v1.5 CCT standard. Gunakan token pool BurnMint di kedua sisi (source chain pilihan, misal Base Sepolia, dan HashKey Chain Testnet).

### 2.3 HSP Sandbox
- Chain target: `hashkey-testnet` (chain ID 133, sama persis dengan di atas)
- Endpoint utama akan diberikan oleh organizer (`HSP_COORDINATOR_URL`) — daftar API key sendiri di `/register` pada Coordinator
- SDK: `@hsp/sdk`, `@hsp/core`, `@hsp/devkit`, `@hsp/mcp` — semua dari `github.com/project-hsp/hsp` (BELUM ada di npm publik, clone dari source)
- Faucet HSP: `POST <FAUCET_URL>/faucet {address}` → gas + test USDC

### 2.4 Referensi pola sukses kompetitor (SealedHash, project ZK lain edisi sebelumnya)
- Stack ZK yang sudah terbukti jalan di ekosistem HashKey: **Noir 1.0.0-beta.19 → UltraHonk (via @aztec/bb.js 4.1.1) → Solidity verifier**, generate proof di browser (client-side proving). Cold proof ~18.8s, warm ~1.5s. Verifier EIP-170-compliant (di bawah limit 24.576 bytes runtime bytecode).
- Pola testing yang dihargai juri: Foundry test suite lengkap (16/16 atau lebih) melawan fixture proof nyata, bukan mock semata.
- Pola KYC-gating: gunakan `IKycSBT` interface dengan `isHuman()` — sediakan `MockKycSBT` untuk demo TAPI **WAJIB** ditandai eksplisit di README bahwa ini bukan untuk produksi, dan siapkan jalur wire-compatible ke SBT KYC asli HashKey testnet jika tersedia.

---

## 3. ARSITEKTUR SISTEM (HIGH-LEVEL)

```
┌──────────────────────────┐                                      ┌─────────────────────────────────────┐
│   SOURCE CHAIN            │                                      │   HASHKEY CHAIN TESTNET (chain 133)  │
│   (Base Sepolia — primary)│                                      │                                       │
│                            │                                      │  ┌─────────────────────────────────┐ │
│  ┌──────────────────────┐  │   1. Payer signs HSP Mandate         │  │  ShieldAdapter.sol               │ │
│  │ Payer Wallet          │  │      (EIP-712, off-chain)            │  │  (implements @hsp/devkit          │ │
│  │ (mock USDC balance)   │──┼──────────────────────────────────────┼─▶│   adapter interface)              │ │
│  └──────────────────────┘  │                                       │  │                                   │ │
│            │                │   2. CCIP sendMessage:               │  │  - receives CCIP message          │ │
│            │ approve+lock   │      payload = {                     │  │  - extracts Mandate + ZK proof    │ │
│            ▼                │        mandate (signed),             │  │  - verifies range-proof            │ │
│  ┌──────────────────────┐  │        shieldedAmountCommitment,      │  │    (solvency without disclosure)  │ │
│  │ CCIP Router (Base)    │──┼──────────────────────────────────────┼─▶│  - on success: emits Receipt-like │ │
│  │ 0xD3b0...8a93         │  │      + ZK range-proof                │  │    observation event               │ │
│  └──────────────────────┘  │      }                                │  │                                   │ │
│                            │                                       │  └───────────────┬───────────────────┘ │
└──────────────────────────┘                                      │                  │                     │
                                                                     │                  ▼                     │
                                                                     │  ┌─────────────────────────────────┐ │
                                                                     │  │  HSP Coordinator (off-chain)     │ │
                                                                     │  │  - observes ShieldAdapter event  │ │
                                                                     │  │  - runs HSP verifier:            │ │
                                                                     │  │    requiredCaps ⊆ satisfiedCaps  │ │
                                                                     │  │  - issues signed Receipt         │ │
                                                                     │  └───────────────┬───────────────────┘ │
                                                                     │                  │                     │
                                                                     │                  ▼                     │
                                                                     │  ┌─────────────────────────────────┐ │
                                                                     │  │  HSP Explorer + our Dashboard    │ │
                                                                     │  │  - public: status SETTLED/etc    │ │
                                                                     │  │  - amount: HIDDEN (commitment)   │ │
                                                                     │  │  - view-key holder: can decrypt  │ │
                                                                     │  └─────────────────────────────────┘ │
                                                                     └─────────────────────────────────────┘

                              ┌───────────────────────────────────────┐
                              │  AI CAPABILITY ADVISOR (off-chain svc) │
                              │  - reads payer wallet history          │
                              │  - reads /issuers endpoint HSP         │
                              │  - recommends capability profile       │
                              │    (public vs kyc+sanctions)           │
                              │  - human-in-the-loop: payer approves   │
                              │    BEFORE signing Mandate              │
                              │  - NEVER auto-signs, NEVER bypasses    │
                              │    cryptographic verifier              │
                              └───────────────────────────────────────┘
```

### Prinsip arsitektur yang TIDAK BOLEH DILANGGAR

1. **Verifier HSP tidak boleh diubah.** Kita hanya menambah *proof schema baru* di level adapter, sesuai filosofi resmi `@hsp/devkit`: "the verifier never changes; only your proof schema does." Jangan membangun verifier custom yang menggantikan logic ACCEPT/REJECT milik HSP.
2. **Zero-custody tetap dijaga.** Dana TIDAK PERNAH disimpan di kontrak perantara milik kita. CCIP Router dan token pool BurnMint adalah satu-satunya yang memindahkan dana; kontrak kita (`ShieldAdapter.sol`) hanya observer/verifier, persis pola Coordinator HSP asli ("custody-free... only signs observations").
3. **AI agent tidak pernah menjadi titik kepercayaan baru.** AI Capability Advisor hanya MEREKOMENDASIKAN capability profile sebelum payer menandatangani mandate. Keputusan ACCEPT/REJECT akhir tetap 100% milik HSP verifier kriptografis. Ini WAJIB ditegaskan di UI dan dokumentasi — jangan biarkan AI terlihat seperti "menyetujui" transaksi.
4. **Jangan pernah fabrikasi tx_hash atau bukti on-chain.** Jika suatu komponen belum live (misal mainnet belum sempat dideploy), tandai eksplisit `anchored: false` dengan transparency note di UI — JANGAN tampilkan data palsu sebagai bukti nyata. Ini hard rule, pelanggaran = red flag fatal di mata juri.

---

## 4. ENTITY RELATIONSHIP DIAGRAM (ERD) — OFF-CHAIN DATABASE

Database off-chain (SQLite untuk hackathon, gunakan `better-sqlite3`) dipakai untuk indexing, dashboard, dan evidence page — BUKAN sumber kebenaran (source of truth tetap on-chain + HSP Coordinator).

```
┌─────────────────────────────┐       ┌──────────────────────────────┐
│  shielded_payments           │       │  capability_recommendations    │
├─────────────────────────────┤       ├──────────────────────────────┤
│  PK payment_id (= mandate    │       │  PK id                        │
│     hash, hex string)        │       │  FK payment_id ──────────────┐│
│     source_chain_selector    │       │     payer_address             ││
│     source_chain_name        │◀──────┤     recommended_capabilities  ││
│     dest_chain_selector      │  1:1  │       (json: ["attests:kyc",  ││
│       (always HashKey 133)   │       │        "attests:sanctions"])  ││
│     payer_address            │       │     reasoning_summary (text,  ││
│     amount_commitment        │       │       human-readable AI       ││
│       (hex, the Pedersen/    │       │       explanation)            ││
│        range-proof commit)   │       │     wallet_risk_signals (json)││
│     ccip_message_id          │       │     payer_approved (boolean)  ││
│     ccip_tx_hash (source)    │       │     created_at                │
│     dest_tx_hash             │       └──────────────────────────────┘
│       (HashKey settlement)   │
│     status (enum:             │       ┌──────────────────────────────┐
│       CCIP_PENDING,           │       │  view_key_grants               │
│       CCIP_DELIVERED,         │       ├──────────────────────────────┤
│       HSP_PROPOSED,           │       │  PK id                        │
│       HSP_OBSERVED,           │       │  FK payment_id ──────────────┐│
│       HSP_SETTLED,            │       │     grantee_address           ││
│       FAILED)                 │       │       (regulator/auditor)     ││
│     hsp_receipt_id            │       │     encrypted_view_key        ││
│       (nullable until         │       │       (amount decryption key, ││
│        observed)              │       │        encrypted to grantee   ││
│     created_at                │       │        pubkey)                ││
│     updated_at                │       │     granted_by (payer addr)   ││
│     anchored (boolean —       │       │     granted_at                │
│       FALSE until real        │       │     revoked (boolean)         │
│       mainnet/testnet tx      │       └──────────────────────────────┘
│       confirmed; NEVER fake)  │
└──────────────┬────────────────┘
               │ 1:N
               ▼
┌─────────────────────────────┐       ┌──────────────────────────────┐
│  zk_proofs                   │       │  conformance_test_runs         │
├─────────────────────────────┤       ├──────────────────────────────┤
│  PK id                       │       │  PK id                        │
│  FK payment_id ──────────────┤       │     test_suite (enum:         │
│     proof_type                │       │       forged_signature,       │
│       (enum: range_proof,     │       │       replay, deadline,       │
│        solvency_proof)        │       │       observation_reuse,      │
│     circuit_version            │       │       happy_accept, ...)      │
│       (e.g. noir-1.0.0-beta19)│       │     result (enum: PASS, FAIL) │
│     proof_bytes (hex/blob)    │       │     run_at                    │
│     public_inputs (json)      │       │     log_output (text)         │
│     verification_status       │       └──────────────────────────────┘
│       (enum: PENDING, VALID,  │
│        INVALID)                │
│     verified_at                │
└─────────────────────────────┘

┌─────────────────────────────┐
│  evidence_log                 │   (append-only audit trail for judges;
├─────────────────────────────┤    every state transition writes a row)
│  PK id                       │
│  FK payment_id                │
│     event_type (text)        │
│     event_data (json)        │
│     sha256_hash (hex —       │
│       hash-chained to        │
│       previous row's hash    │
│       for tamper-evidence)   │
│     timestamp                │
└─────────────────────────────┘
```

### Relasi kunci
- `shielded_payments` adalah tabel pusat — satu baris per cross-chain settlement attempt.
- `zk_proofs` 1:N ke `shielded_payments` karena satu payment bisa punya proof range (jumlah) DAN proof solvency (saldo cukup) sebagai dua proof terpisah, atau digabung jadi satu sirkuit (keputusan implementasi, dokumentasikan pilihanmu).
- `capability_recommendations` 1:1 — satu rekomendasi AI per payment, dibuat SEBELUM mandate ditandatangani (jadi `payment_id` di sini bisa merujuk ke draft payment yang belum settle).
- `view_key_grants` 1:N — satu payment confidential bisa memberi akses ke beberapa regulator/auditor berbeda.
- `evidence_log` adalah hash-chained log (pola SHA-256 chaining sederhana, bukan blockchain sungguhan) untuk membuktikan ke juri bahwa log tidak dimanipulasi setelah fakta — gunakan pola ini di endpoint `/api/evidence`.

---

## 5. SPESIFIKASI SMART CONTRACT

### 5.1 `ShieldAdapter.sol` (deploy di HashKey Chain Testnet)

Tanggung jawab:
- Menerima pesan CCIP dari `CCIPReceiver` (inherit dari Chainlink `CCIPReceiver.sol`)
- Decode payload: `(bytes signedMandate, bytes32 amountCommitment, bytes zkProof, bytes[] attestations)`
- Verifikasi ZK range-proof secara on-chain (panggil Solidity verifier hasil compile dari sirkuit Noir/Circom — generate verifier ini sebagai kontrak terpisah, JANGAN tulis verifier ZK manual dari nol)
- Verifikasi bahwa `Transfer` yang terjadi di chain asal (dibuktikan lewat CCIP message yang sudah difinalisasi DON) sesuai dengan `amountCommitment` (commitment matching, BUKAN exact amount — itulah intinya shielded)
- Emit event `SettlementObserved(bytes32 paymentId, bytes32 amountCommitment, address payer, uint64 sourceChainSelector)` — event inilah yang akan "ditangkap" sebagai observation oleh komponen off-chain yang berperan sebagai adapter dalam pola `@hsp/devkit` (signing Receipt mengikuti pola adapter key yang dijelaskan di HSP docs)
- Fungsi conformance-test wajib (ikuti pola devkit): tolak forged signature, tolak replay (paymentId sudah pernah diobservasi), tolak observation reuse (satu CCIP message ID hanya bisa settle satu payment), tolak settlement setelah mandate deadline

Constraint teknis:
- WAJIB pakai `CCIPReceiver` resmi dari `@chainlink/contracts-ccip` (jangan reimplement)
- WAJIB validasi `msg.sender == i_ccipRouter` di `_ccipReceive` (standar keamanan CCIP, sering jadi celah kalau lupa)
- WAJIB allowlist source chain selector dan source sender address (jangan terima pesan dari sender sembarangan — ini celah keamanan paling umum di tutorial CCIP yang tidak production-grade)
- Verifier ZK harus kontrak terpisah hasil auto-generate dari toolchain (Noir→UltraHonk→Solidity, atau circom→snarkjs, pilih salah satu yang paling kamu kuasai), JANGAN tulis pairing check manual

### 5.2 `MockUSDC.sol` + Token Pool (CCT standard)

- Deploy `BurnMintERC677` (kontrak resmi Chainlink, ada di `@chainlink/contracts-ccip`) sebagai mock USDC di kedua sisi (source chain misal Base Sepolia, dan HashKey Chain Testnet)
- Deploy `BurnMintTokenPool` di kedua sisi, daftarkan ke `TokenAdminRegistry` masing-masing chain (self-serve, kamu sebagai deployer otomatis jadi admin token karena kamu yang deploy token-nya)
- Set rate limit wajar untuk demo (jangan terlalu kecil sampai demo gagal, jangan terlalu besar sampai terlihat tidak aman)
- Ikuti tutorial resmi Chainlink CCT standard step-by-step (`docs.chain.link` → CCIP → Cross-Chain Token standard) untuk urutan deployment yang benar: deploy token → deploy pool → claim admin role → accept admin role → set pool → configure rate limits → set lane (chain-to-chain pool mapping)

### 5.3 ZK Circuit (range-proof / solvency proof)

Tujuan: bukti bahwa `amount yang dikirim ≤ saldo payer di chain asal` (atau pola lain yang lebih sederhana: cukup buktikan `amount` cocok dengan komitmen, tanpa membuka nilainya) — TANPA membuka nilai exact amount ke publik.

Rekomendasi stack (mengikuti pola yang sudah terbukti jalan di ekosistem HashKey, SealedHash): **Noir** (circuit language) → **UltraHonk** (proving backend via `@aztec/bb.js`) → auto-generate Solidity verifier. Proving dilakukan client-side di browser (bukan server) untuk menjaga prinsip "plaintext never leaves the browser."

Sirkuit minimal yang dibutuhkan:
```
private inputs: amount, blinding_factor, payer_balance
public inputs: commitment (Pedersen/hash of amount+blinding), max_allowed_amount (policy ceiling jika ada)
constraint: commitment == hash(amount, blinding_factor)
constraint: amount <= payer_balance
constraint: amount > 0
```

Jika waktu sangat terbatas, versi minimal viable: cukup buktikan `amount` cocok dengan `commitment` TANPA constraint solvency penuh (solvency check dilakukan terpisah lewat saldo on-chain yang sudah pasti cukup karena CCIP mengunci dana sebelum proof diverifikasi) — dokumentasikan trade-off ini secara jujur di README, JANGAN overclaim "full solvency proof" kalau yang diimplementasi cuma commitment matching.

### 5.4 View-Key Disclosure (selective compliance)

- Payer, saat membuat payment confidential, generate keypair tambahan (atau derive dari signature) khusus untuk enkripsi `amount` asli
- `amount` asli dienkripsi dengan public key ini, disimpan off-chain (di `view_key_grants` table atau di event data terenkripsi)
- Payer bisa memilih memberikan private key (atau key terenkripsi-ulang ke grantee) ke regulator/auditor tertentu kapan pun — opsional, bukan default
- Ini PERSIS mereplikasi pola yang disebut di roadmap resmi HSP ("optional view-key disclosure to a regulator") dan pola yang sudah dibuktikan ANZ Bank ("full privacy preservation" via CCIP Private Transactions) — sebutkan eksplisit kedua referensi ini di submission document sebagai validasi pola, BUKAN klaim bahwa fitur ini sudah ada di kedua sistem tersebut (karena belum, ini yang sedang kita bangun untuk mengisi gap).

---

## 6. AI CAPABILITY ADVISOR (komponen track AI)

### Tujuan
Membantu payer (terutama yang awam protokol HSP) menentukan capability profile mandate (`attests:kyc`, `attests:sanctions`, atau kosong untuk public) SEBELUM menandatangani — mencegah dana "nyangkut" karena gagal compliance check di sisi tujuan (`HSP-MAND-REQ-INSUFFICIENT` error yang sudah terdokumentasi resmi di HSP).

### Desain wajib: human-in-the-loop, BUKAN otonom penuh
Mengikuti pola pemenang edisi sebelumnya (Sentinel Treasury — "explainable AI-generated recommendations... with human-in-the-loop approval"). Agent ini:
1. Membaca riwayat wallet payer (jumlah transaksi historis, chain yang pernah dipakai — data publik on-chain, BUKAN data pribadi sensitif)
2. Membaca `/issuers` endpoint HSP (issuer attestation mana yang dipercaya deployment ini)
3. Membaca besaran transaksi yang akan dikirim
4. Menghasilkan REKOMENDASI capability profile + alasan dalam bahasa natural ("Karena nilai transaksi di atas threshold X dan tujuan adalah compliant payment HSP, disarankan menyertakan attests:kyc dan attests:sanctions")
5. Payer harus EKSPLISIT approve rekomendasi ini di UI sebelum mandate dibangun dan ditandatangani — tombol "Approve & Sign" terpisah dari rekomendasi AI
6. Disclaimer permanen di UI: "AI recommendation is advisory only. Final settlement decision is made exclusively by HSP's cryptographic verifier (requiredCapabilities ⊆ satisfiedCapabilities). The AI never signs, never holds funds, never overrides the verifier."

### Implementasi
- Service kecil (Node.js/TypeScript, bisa dipanggil dari backend Express) yang memanggil LLM (boleh pakai Claude API langsung — sebutkan eksplisit di README bahwa ini "Claude-powered advisor" karena ini hackathon judges yang familiar Web3+AI, transparansi soal stack AI yang dipakai adalah nilai plus) dengan system prompt yang HANYA bertugas merekomendasikan, tidak pernah diberi kemampuan untuk menandatangani transaksi atau memanggil endpoint write HSP secara langsung.
- Output WAJIB terstruktur JSON (capability array + reasoning text) supaya bisa di-render rapi di UI, bukan dump teks bebas.

---

## 7. BACKEND API (Express, mengikuti pola Speedrun Protocol skill)

Endpoint minimum yang WAJIB ada (pola evidence-first untuk judges):

```
GET  /api/health                      → { status: "ok" }
GET  /api/stats                       → agregat: total payments, total volume (commitment count, BUKAN nilai asli), success rate
GET  /api/payments                    → daftar shielded_payments (amount tetap hidden, hanya commitment + status)
GET  /api/payments/:id                → detail satu payment (status lifecycle lengkap, link ke CCIP explorer + HSP explorer)
GET  /api/payments/:id/evidence       → bukti lengkap: zk_proof verification_status, hash chain dari evidence_log
POST /api/advisor/recommend           → trigger AI Capability Advisor, return rekomendasi (belum sign apapun)
POST /api/payments/initiate           → setelah payer approve rekomendasi & sign mandate, submit untuk mulai proses CCIP+HSP
GET  /api/verify/:paymentId           → re-jalankan verifikasi independen (commitment match + HSP verifier ACCEPT/REJECT), TIDAK mempercayai status tersimpan
GET  /api/view-key/:paymentId         → (auth-gated, hanya grantee) decrypt & tampilkan amount asli jika punya akses
```

Aturan keras (dari antipatterns hackathon-engine skill, WAJIB dipatuhi):
- SEMUA panggilan SDK (CCIP, HSP, ZK prover) dibungkus try/catch dengan fallback eksplisit — JANGAN crash demo karena field API berubah
- `data.field ?? defaultValue` di semua akses response API eksternal
- TIDAK ADA private key di source code — `.env` + `.env.example` dengan value dikosongkan
- TIDAK ADA fabricated tx_hash — kalau testnet/mainnet belum sempat dideploy penuh, field `anchored: false` + transparency note, BUKAN data palsu

---

## 8. FRONTEND / TAMPILAN

### Halaman wajib

**1. Landing / Send Payment (halaman utama)**
- Connect wallet (wagmi + viem, mendukung MetaMask minimal)
- Pilih source chain (dropdown: Base Sepolia, Arbitrum Sepolia, BNB Testnet, Ethereum Sepolia, OP Sepolia)
- Input recipient (address HashKey Chain) + amount
- Tampilkan AI Capability Advisor recommendation card (dengan reasoning text, badge "AI Suggestion — Advisory Only")
- Tombol "Approve & Sign Mandate" → trigger EIP-712 signature di wallet
- Setelah sign: tombol "Send via CCIP" → trigger approve + CCIP send transaction
- Progress tracker visual (step indicator): Mandate Signed → CCIP Sent → CCIP Delivered → HSP Observed → HSP Settled

**2. Payment Detail / Explorer Page** (`/payment/:id`)
- Status lifecycle lengkap dengan timestamp tiap tahap
- Amount: **selalu tampil sebagai "🔒 Hidden — Shielded"** kecuali viewer adalah payer sendiri atau grantee dengan view-key valid
- Link cross-reference ke: CCIP Explorer (`ccip.chain.link`), HashKey block explorer, HSP Explorer (`/explorer?id=`)
- Tombol "Grant View-Key Access" (hanya muncul untuk payer) — input address regulator/auditor, generate & kirim encrypted key
- Section "Verify Independently" — tombol yang menjalankan ulang verifikasi commitment + memanggil endpoint verify, menampilkan hasil real-time (bukan dari cache), untuk membuktikan ke juri prinsip "don't trust, verify"

**3. Evidence Dashboard** (`/evidence`, khusus judges)
- Tabel `conformance_test_runs` — semua hasil test forged signature/replay/deadline/observation reuse dengan status PASS/FAIL
- Hash-chain viewer dari `evidence_log` — tampilkan beberapa baris terakhir dengan SHA-256 chaining yang bisa diverifikasi manual
- Statistik agregat: jumlah payment yang berhasil settle, jumlah test conformance yang lolos, link ke smart contract yang sudah diverifikasi di block explorer

**4. AI Advisor Standalone Demo** (`/advisor`)
- Form input manual (wallet address, amount, source chain) untuk menunjukkan kemampuan AI advisor secara terpisah, untuk juri track AI yang mungkin tidak ingin menjalankan full flow cross-chain
- Tampilkan reasoning text lengkap, capability recommendation, dan confidence framing yang jujur (jangan overclaim akurasi)

### Style guideline
- Gunakan skill `frontend-design` saat membangun ini — jangan default ke template generik. Tema visual: institutional fintech serius (bukan playful crypto), warna gelap dengan aksen yang mengasosiasikan "shielded/privacy" (misal deep navy + cyan/teal untuk elemen cryptographic proof) dan "compliance" (hijau/emas untuk status verified).
- Tunjukkan SELALU lambang gembok/shield di mana pun amount disembunyikan — buat metafora visual privasi konsisten di seluruh UI.

---

## 9. SECURITY MODEL (WAJIB didokumentasikan di README, juri akan cek ini)

### Threat model & mitigasi

| Ancaman | Mitigasi |
|---|---|
| Pesan CCIP palsu dari sender tak dikenal | Allowlist source chain selector + source sender address di `_ccipReceive` |
| Replay attack (payment sama disettle dua kali) | `paymentId` (mandate hash) dicek unik sebelum observation diterima, ikuti pola `HSP-RCPT-OBS-REUSED` dari spec asli |
| Forged signature pada Mandate | Verifikasi EIP-712 signature on-chain sebelum accept observation; conformance test wajib menguji ini |
| Self-KYC / mock issuer dipakai di produksi | `MockKycSBT`/mock issuer ditandai eksplisit, env flip jelas ke issuer asli, README mencantumkan warning "MUST NOT ship mock in production" |
| AI advisor jadi titik kepercayaan tunggal | AI tidak pernah menandatangani atau memanggil write endpoint langsung; payer approval eksplisit wajib; verifier kriptografis HSP tetap otoritas final |
| Amount commitment bisa dipalsukan | ZK range-proof diverifikasi on-chain oleh Solidity verifier hasil compile sirkuit, bukan trust off-chain |
| Kebocoran amount lewat metadata (gas, timing) | Dokumentasikan sebagai known limitation jika tidak sempat dimitigasi penuh — JANGAN overclaim privasi sempurna kalau ada kebocoran sisi-kanal yang belum ditangani |
| View-key bocor / disalahgunakan | Key terenkripsi end-to-end ke grantee pubkey, payer bisa revoke akses (`revoked` flag), bukan one-way disclosure permanen |
| Private key developer di source code | `.env.example` dengan value kosong, grep check sebelum submit (`grep -c "PRIVATE_KEY=0x" README.md` harus 0) |

### Pre-submission checklist (jalankan SEMUA sebelum submit, dari hackathon-engine skill)
```bash
npm run typecheck            # 0 errors
npm run test                 # semua pass, termasuk conformance suite ZK + CCIP + HSP adapter
npm run dev                  # start tanpa crash
curl localhost:3001/api/health
curl localhost:3001/api/stats
curl localhost:3001/api/evidence
grep -c "TODO\|FIXME\|XXX" README.md     # harus 0
grep -c "private.*key.*0x\|api_key.*=.*sk" README.md  # harus 0 (key redacted)
git status                   # clean tree, sudah di-push
```

---

## 10. SUBMISSION DOCUMENT — STRUKTUR YANG WAJIB DIIKUTI

Susun README.md / submission doc dengan struktur ini (judges scan dalam hitungan detik, urutan ini PENTING):

1. **One-liner pitch** (format: "A [benefit] for [target user] that [solves problem]" — JANGAN "A tool that does X")
2. **Problem statement** — sebutkan secara spesifik: HSP saat ini single-chain, likuiditas institusional tersebar, privasi vs compliance adalah trade-off yang belum terselesaikan di ekosistem HashKey
3. **Live demo links** — testnet contract address (sudah diverifikasi di explorer), dashboard URL, video demo 3-5 menit
4. **Architecture diagram** (versi ringkas dari section 3 di atas, gambar bukan teks panjang)
5. **What makes this novel** — sebutkan dengan bahasa yang TIDAK overclaim: "I have not found another HashKey Chain Horizon submission that combines CCIP cross-chain settlement with HSP's confidential payment roadmap" (BUKAN "no one else thought of this")
6. **Officially recommended products used** — HSP (`@hsp/devkit` custom adapter), Chainlink CCIP (CCT standard + Programmable Token Transfer) — highlight ini karena brief eksplisit bilang extra points untuk pemakaian produk resmi
7. **Security & conformance** — ringkasan section 9 di atas + link ke test results
8. **Known limitations** — JUJUR sebutkan apa yang belum sempurna (mis. side-channel privacy belum dimitigasi, solvency proof versi minimal, dst) — ini justru menambah kredibilitas di mata juri teknis
9. **Roadmap pasca-hackathon** — sebutkan singkat (HashKey menyediakan dukungan inkubasi pasca-event, sesuai brief)

---

## 11. SPEEDRUN PROTOCOL — URUTAN EKSEKUSI

Ikuti urutan ini, JANGAN loncat fase atau kerjakan paralel tanpa fondasi fase sebelumnya selesai:

**Fase 0 (sebelum coding apapun): Verifikasi ulang dokumentasi live**
- Baca ulang `https://hsp-hackathon.hashkeymerchant.com/docs` (atau URL Coordinator terbaru yang diberikan organizer) — confirm wire format Mandate/Receipt/Attestation belum berubah dari spec ini
- Clone `github.com/project-hsp/hsp`, baca `docs/guide.md` dan `packages/devkit/README.md` secara penuh
- Baca tutorial resmi terbaru Chainlink CCT standard di `docs.chain.link` (urutan deploy token+pool bisa berubah versi)
- Daftar API key HSP di `/register`, klaim testnet HSK dari faucet, klaim testnet token di source chain pilihan

**Fase 1: Scaffold (jam 1-3)**
- Monorepo (npm workspaces): `/contracts` (Foundry), `/backend` (Express+TS+SQLite), `/frontend` (Next.js+Tailwind), `/circuits` (Noir)
- `.env.example` lengkap untuk semua service
- Git init, commit pertama

**Fase 2: Smart contract inti (jam 3-8)**
- Deploy `MockUSDC` (BurnMintERC677) + token pool di source chain (Base Sepolia) dan HashKey testnet
- Deploy `ShieldAdapter.sol` di HashKey testnet (versi awal TANPA ZK dulu — pakai placeholder verifier yang selalu return true, supaya end-to-end flow CCIP→HashKey bisa diuji dulu)
- Test end-to-end: kirim mock USDC dari Base Sepolia → HashKey testnet via CCIP, pastikan `ShieldAdapter` menerima dan emit event

**Fase 3: ZK circuit + integrasi (jam 8-14)**
- Bangun sirkuit Noir range-proof/commitment (mulai dari versi minimal sesuai section 5.3)
- Generate Solidity verifier, ganti placeholder verifier di `ShieldAdapter.sol`
- Integrasi proving client-side di frontend (browser-based proving)
- Test ulang end-to-end dengan ZK proof asli

**Fase 4: HSP adapter integration (jam 14-18)**
- Implementasi observer/adapter pattern sesuai `@hsp/devkit` template
- Jalankan conformance runner resmi devkit (forged signature, replay, deadline, dst)
- Integrasi dengan HSP Coordinator sandbox — pastikan status lifecycle PROPOSED→SETTLED tercapai

**Fase 5: AI Advisor + dashboard (jam 18-22)**
- Backend service AI advisor + endpoint
- Frontend lengkap (4 halaman di section 8)
- Evidence page + hash-chained log

**Fase 6: Hardening + evidence (jam 22-28)**
- Generate 10+ payment nyata (testnet) untuk evidence, BUKAN data dummy
- Pre-submission checklist (section 9)
- Record demo video 3-5 menit (tunjukkan: connect wallet → AI recommendation → sign mandate → CCIP send → status tracker → settled → amount tetap hidden di explorer publik → grant view-key ke alamat regulator demo → regulator bisa lihat amount asli)
- Tulis submission document (section 10)

**Fase 7: Submit (1-2 hari sebelum deadline asli, BUKAN menit terakhir)**
- Final checklist, push ke GitHub, submit BUIDL di DoraHacks dengan track DeFi (dan AI jika platform mengizinkan dual-track)
- SETELAH submit: JANGAN sentuh lagi kecuali ada bug fatal

---

## 12. CATATAN PENUTUP UNTUK OPUS 4.6

- Prioritaskan **end-to-end flow yang benar-benar jalan di testnet** di atas fitur tambahan yang setengah jadi. Submission dengan 1 flow lengkap yang teruji jauh lebih kuat daripada 5 fitur yang masing-masing setengah jadi.
- Kalau di tengah jalan menemukan bahwa salah satu komponen (misal ZK circuit) terlalu memakan waktu dan mengancam deadline, JANGAN korbankan kejujuran — turunkan ke versi minimal viable (section 5.3 sudah sediakan fallback) dan dokumentasikan trade-off, daripada memalsukan hasil.
- Setiap klaim teknis di submission document harus bisa diverifikasi juri dalam hitungan menit (link kontrak ke explorer, link transaksi CCIP, hasil test conformance) — ini prinsip "verify in 60 seconds" yang paling dihargai juri hackathon manapun.
- Jika menemukan bahwa dokumentasi HSP live ternyata berbeda signifikan dari spec ini (karena ini protokol pre-1.0 yang bisa berubah), sesuaikan implementasi tapi PERTAHANKAN tiga prinsip arsitektur di section 3 (verifier tidak diubah, zero-custody, AI bukan titik kepercayaan).
