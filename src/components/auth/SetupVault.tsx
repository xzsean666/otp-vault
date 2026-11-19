import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, KeyRound, Sparkles } from 'lucide-react';

export const SetupVault: React.FC = () => {
  const { setupVault } = useVault();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evaluate password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '未输入', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: '较弱', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: '良好', color: 'bg-vault-gold' };
    if (score <= 4) return { score: 3, label: '极佳', color: 'bg-cyan-500' };
    return { score: 4, label: '高强度', color: 'bg-vault-emerald' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('主密码长度不能少于 8 位 (建议 12 位以上以确保强加密安全)');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致，请核对');
      return;
    }

    setLoading(true);
    try {
      await setupVault(password);
    } catch (err: any) {
      setError(err?.message || '初始化保险库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Decorative Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-vault-850 border border-vault-700/60 shadow-lg shadow-black/40">
            <span className="w-2 h-2 rounded-full bg-vault-gold animate-pulse"></span>
            <span className="text-xs font-mono font-medium tracking-wider text-slate-300 uppercase">
              100% Client-Side WebCrypto
            </span>
          </div>
        </div>

        {/* Setup Card */}
        <div className="relative rounded-2xl bg-gradient-to-b from-vault-900 to-vault-950 border border-vault-700/50 p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle Top Glow Accent */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-vault-gold/50 to-transparent" />

          {/* Header Icon & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3.5 rounded-2xl bg-vault-850/80 border border-vault-700 text-vault-gold mb-4 shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              初始化离线保险库
            </h1>
            <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
              设置您的主密码。所有双因子密钥将通过 PBKDF2 + AES-GCM 256 位强加密储存于浏览器本地。
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Master Password Input */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                设置主密码 (Master Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入主密码 (建议 12 位以上)"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-vault-950/80 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold focus:ring-1 focus:ring-vault-gold text-sm transition-all"
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

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">密码强度:</span>
                    <span className="font-medium text-slate-200">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          step <= strength.score ? strength.color : 'bg-vault-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                确认主密码 (Confirm Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入主密码"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-vault-950/80 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold focus:ring-1 focus:ring-vault-gold text-sm transition-all"
                  required
                />
              </div>
            </div>

            {/* Zero-Knowledge Disclaimer */}
            <div className="p-3.5 rounded-xl bg-vault-950/60 border border-vault-gold/20 flex items-start gap-3 text-xs text-slate-300">
              <AlertTriangle className="w-4 h-4 text-vault-gold flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-vault-gold block font-semibold mb-0.5">零知识安全提示</strong>
                本程序为纯静态离线架构，无后端数据库。若遗忘主密码，任何人都无法为您恢复数据。请务必妥善记录。
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-vault-950 bg-gradient-to-r from-vault-gold to-vault-gold-light hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-vault-gold/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-950 border-t-transparent rounded-full animate-spin" />
                  <span>加密生成派生密钥中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>创建并启用保险库</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
