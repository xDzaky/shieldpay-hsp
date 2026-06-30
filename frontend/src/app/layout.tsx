import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Shield, Activity, FileCheck, Bot, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "ShieldPay-HSP | Confidential Cross-Chain Settlement",
  description:
    "Bridge stablecoin liquidity across chains to HSP settlement on HashKey Chain with ZK-shielded amounts. CCIP + HSP + Zero-Knowledge Proofs + AI Advisor.",
  keywords: ["HashKey Chain", "CCIP", "HSP", "ZK proof", "cross-chain", "settlement", "DeFi"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0A0F1E] text-[#F9FAFB] antialiased">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1F2937] bg-[rgba(10,15,30,0.9)] backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4AA] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[#00D4AA]/20 group-hover:shadow-[#00D4AA]/40 transition-shadow">
                  <Shield size={18} className="text-[#0A0F1E]" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold tracking-tight">
                  Shield<span className="text-[#00D4AA]">Pay</span>
                </span>
              </Link>

              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/" icon={<Zap size={14} />} label="Send" />
                <NavLink href="/evidence" icon={<FileCheck size={14} />} label="Evidence" />
                <NavLink href="/advisor" icon={<Bot size={14} />} label="AI Advisor" />
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] status-dot" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
                    Testnet
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-[#6B7280]">
                  <Activity size={12} />
                  <span>HSK-133</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="pt-16 min-h-screen bg-grid-pattern">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#1F2937] bg-[rgba(10,15,30,0.9)] py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#00D4AA]" />
                <span className="text-sm text-[#6B7280]">
                  ShieldPay-HSP — HashKey Chain On-Chain Horizon Hackathon 2026
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                <span>Built with CCIP + HSP + ZK + AI</span>
                <span>•</span>
                <span>Track: DeFi + AI</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#9CA3AF] 
        hover:text-[#F9FAFB] hover:bg-[#1A1F2E] transition-all duration-200"
    >
      {icon}
      {label}
    </Link>
  );
}
