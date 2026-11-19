import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TotpAccount } from '../../types/vault';
import { generateTotp, getTotpTimeRemaining } from '../../lib/totp';
import { subscribeClock } from '../../lib/clock';
import { CountdownProgress } from './CountdownProgress';
import {
  Copy,
  Check,
  Star,
  QrCode,
  MoreVertical,
  Trash2,
  Edit2,
  Key,
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';

interface TotpCardProps {
  account: TotpAccount;
  onExportSingle: (account: TotpAccount) => void;
  onEdit: (account: TotpAccount) => void;
  onDelete: (id: string) => void;
}

export const TotpCard: React.FC<TotpCardProps> = ({
  account,
  onExportSingle,
  onEdit,
  onDelete,
}) => {
  const { toggleFavorite } = useVault();
  const [code, setCode] = useState<string>('------');
  const [remaining, setRemaining] = useState<number>(30);
  const [copied, setCopied] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const lastStepRef = useRef<number>(-1);

  const updateCode = useCallback(async () => {
    try {
      const currentCode = await generateTotp(account.secret, {
        algorithm: account.algorithm,
        digits: account.digits || 6,
        period: account.period || 30,
      });
      setCode(currentCode);
    } catch (err) {
      console.error('Error generating OTP for account', account.id, err);
      setCode('ERR');
    }
  }, [account.secret, account.algorithm, account.digits, account.period, account.id]);

  useEffect(() => {
    const period = account.period || 30;

    const unsubscribe = subscribeClock((now) => {
      const currentStep = Math.floor(now / 1000 / period);
      const { remaining: rem } = getTotpTimeRemaining(period, now);
      setRemaining(rem);

      if (currentStep !== lastStepRef.current) {
        lastStepRef.current = currentStep;
        updateCode();
      }
    });

    return unsubscribe;
  }, [account.period, updateCode]);

  // Format code with space: 6 digits -> "123 456", 8 digits -> "1234 5678"
  const formattedCode =
    code.length === 6
      ? `${code.slice(0, 3)} ${code.slice(3)}`
      : code.length === 8
      ? `${code.slice(0, 4)} ${code.slice(4)}`
      : code;

  const handleCopy = async () => {
    if (code === '------' || code === 'ERR') return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const isUrgent = remaining <= 5;

  return (
    <div className="relative group rounded-2xl bg-gradient-to-b from-vault-900 to-vault-950 border border-vault-800 hover:border-vault-700/80 p-5 shadow-lg hover:shadow-xl hover:shadow-black/50 transition-all duration-200">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-vault-850 border border-vault-700/80 flex items-center justify-center text-vault-gold flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <Key className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            {account.issuer && (
              <span className="block text-xs font-semibold text-vault-gold uppercase tracking-wider truncate font-mono">
                {account.issuer}
              </span>
            )}
            <h3
              className="text-sm font-semibold text-white truncate"
              title={account.label}
            >
              {account.label}
            </h3>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => toggleFavorite(account.id)}
            title={account.favorite ? '取消收藏' : '置顶收藏'}
            className={`p-1.5 rounded-lg transition-colors ${
              account.favorite
                ? 'text-vault-gold bg-vault-gold/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-vault-800'
            }`}
          >
            <Star
              className={`w-4 h-4 ${account.favorite ? 'fill-vault-gold' : ''}`}
            />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-vault-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-vault-900 border border-vault-700/80 py-1.5 shadow-2xl z-30 animate-fade-in text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onExportSingle(account);
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-slate-300 hover:text-white hover:bg-vault-800 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-vault-gold" />
                    <span>显示二维码 / 导出</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(account);
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-slate-300 hover:text-white hover:bg-vault-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>编辑标签与账户</span>
                  </button>
                  <div className="border-t border-vault-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(account.id);
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除该密钥</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main OTP Code Display & One-Click Copy */}
      <div
        onClick={handleCopy}
        className="cursor-pointer group/code rounded-xl bg-vault-950/70 border border-vault-800 hover:border-vault-gold/40 p-3.5 flex items-center justify-between transition-all"
        title="点击复制动态口令"
      >
        <div className="flex items-baseline gap-2">
          <span
            className={`font-mono text-2xl font-bold tracking-widest select-all transition-colors ${
              isUrgent ? 'text-rose-400' : 'text-slate-100 group-hover/code:text-vault-gold'
            }`}
          >
            {formattedCode}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {account.algorithm !== 'SHA-1' && `${account.algorithm} · `}
            {account.period !== 30 && `${account.period}s`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Circular Countdown */}
          <CountdownProgress
            remaining={remaining}
            period={account.period || 30}
            size={32}
            strokeWidth={3}
          />

          {/* Copy Button / Feedback */}
          <div
            className={`p-2 rounded-lg transition-all ${
              copied
                ? 'bg-vault-emerald/20 text-vault-emerald'
                : 'text-slate-400 group-hover/code:text-white group-hover/code:bg-vault-850'
            }`}
          >
            {copied ? (
              <Check className="w-4 h-4 animate-scale" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Copy Toast Feedback */}
      {copied && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-vault-emerald text-vault-950 text-xs font-semibold shadow-lg shadow-vault-emerald/30 animate-fade-in flex items-center gap-1 pointer-events-none z-10">
          <Check className="w-3 h-3 stroke-[3]" />
          <span>已复制验证码</span>
        </div>
      )}
    </div>
  );
};
