import React, { useMemo } from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { Header } from './components/layout/Header';
import { SetupVault } from './components/auth/SetupVault';
import { UnlockVault } from './components/auth/UnlockVault';
import { VaultDashboard } from './components/dashboard/VaultDashboard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ShieldAlert } from 'lucide-react';

const VaultContent: React.FC = () => {
  const { status } = useVault();

  // Check Web Crypto API capability
  const isCryptoSupported = useMemo(() => {
    return typeof globalThis !== 'undefined' && !!globalThis.crypto?.subtle;
  }, []);

  if (!isCryptoSupported) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-vault-900 border border-rose-500/40 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">安全环境受限 (Insecure Context)</h2>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            当前页面未通过安全的加密通道加载。为了保障数据安全，请使用 HTTPS 或安全网络环境访问。
          </p>
          <div className="p-3 rounded-lg bg-vault-950 font-mono text-[11px] text-slate-400 border border-vault-800">
            请通过 https:// 或本地安全地址访问
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-2 border-vault-gold border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono text-slate-400">
          正在加载保险库...
        </span>
      </div>
    );
  }

  if (status === 'not-initialized') {
    return <SetupVault />;
  }

  if (status === 'locked') {
    return <UnlockVault />;
  }

  return <VaultDashboard />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <VaultProvider>
        <div className="min-h-screen bg-vault-950 bg-vault-grid text-slate-100 flex flex-col selection:bg-vault-gold/20 selection:text-vault-gold">
          <Header />
          <main className="flex-1 flex flex-col">
            <VaultContent />
          </main>
          <footer className="border-t border-vault-800/40 py-4 px-6 text-center text-[11px] text-slate-500 font-mono">
            OTP Vault &bull; 纯离线端到端加密 &bull; 兼容 Cloudflare Pages 静态部署
          </footer>
        </div>
      </VaultProvider>
    </ErrorBoundary>
  );
}
