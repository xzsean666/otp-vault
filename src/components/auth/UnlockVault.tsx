import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { Lock, Eye, EyeOff, KeyRound, AlertOctagon, Trash2, ArrowRight } from 'lucide-react';

export const UnlockVault: React.FC = () => {
  const { unlockVault, resetEntireVault } = useVault();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError(null);
    setLoading(true);

    try {
      const success = await unlockVault(password);
      if (!success) {
        setError('主密码错误，无法解密保险库');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err: any) {
      setError(err?.message || '解锁失败');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetVault = async () => {
    setResetting(true);
    try {
      await resetEntireVault();
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md transition-transform ${shake ? 'animate-bounce' : ''}`}>
        {/* Security Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-vault-850 border border-vault-700/60 shadow-lg shadow-black/40">
            <span className="w-2 h-2 rounded-full bg-vault-gold"></span>
            <span className="text-xs font-mono font-medium tracking-wider text-slate-300 uppercase">
              Vault Encrypted & Locked
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl bg-gradient-to-b from-vault-900 to-vault-950 border border-vault-700/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-vault-gold/40 to-transparent" />

          {/* Header Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3.5 rounded-2xl bg-vault-850/80 border border-vault-700 text-vault-gold mb-4 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              解锁您的保险库
            </h1>
            <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
              输入您的主密码以解密本地硬件级 AES-GCM 保护的 TOTP 账户列表。
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-5">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="输入主密码"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-vault-950/80 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold focus:ring-1 focus:ring-vault-gold text-sm transition-all"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium flex items-center justify-center gap-1.5">
                <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-vault-950 bg-gradient-to-r from-vault-gold to-vault-gold-light hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-vault-gold/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-950 border-t-transparent rounded-full animate-spin" />
                  <span>解密中...</span>
                </>
              ) : (
                <>
                  <span>解锁保险库</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Reset Vault Option */}
          <div className="mt-8 pt-6 border-t border-vault-800/80 text-center">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>遗忘密码或需要抹除数据？</span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-vault-900 border border-rose-500/40 p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">
                抹除并重置保险库？
              </h3>
              <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
                此操作将从当前浏览器的 IndexedDB 中永久删除所有已保存的双因子密钥和密码散列。此操作不可逆！
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-vault-700 text-slate-300 text-xs font-medium hover:bg-vault-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleResetVault}
                  disabled={resetting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {resetting ? '重置中...' : '确认抹除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
