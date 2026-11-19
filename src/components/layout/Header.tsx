import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  ChevronDown,
  WifiOff,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    status,
    lockVault,
    autoLockMinutes,
    setAutoLockMinutes,
    remainingLockSeconds,
    resetInactivityTimer,
  } = useVault();

  const [showAutoLockMenu, setShowAutoLockMenu] = useState(false);

  const formatLockTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const autoLockOptions = [
    { label: '5 分钟无操作锁定', value: 5 },
    { label: '15 分钟无操作锁定', value: 15 },
    { label: '30 分钟无操作锁定', value: 30 },
    { label: '从不自动锁定', value: 0 },
  ];

  return (
    <header className="border-b border-vault-800/80 bg-vault-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vault-850 to-vault-900 border border-vault-700/80 flex items-center justify-center text-vault-gold shadow-md shadow-black/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white font-mono">
                OTP VAULT
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-vault-emerald/10 text-vault-emerald border border-vault-emerald/20">
                <WifiOff className="w-2.5 h-2.5" />
                OFFLINE
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block -mt-0.5">
              纯本地加密双因子保险库
            </span>
          </div>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-3">
          {status === 'unlocked' && (
            <>
              {/* Auto-lock countdown badge & menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAutoLockMenu(!showAutoLockMenu)}
                  title="自动锁定倒计时 (点击修改时间)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-900 border border-vault-700 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors font-mono"
                >
                  <Clock className="w-3.5 h-3.5 text-vault-gold" />
                  <span>
                    {autoLockMinutes === 0
                      ? '无自动锁定'
                      : formatLockTime(remainingLockSeconds)}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showAutoLockMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAutoLockMenu(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-vault-900 border border-vault-700 py-1.5 shadow-xl z-50 animate-fade-in text-xs">
                    <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-vault-800">
                      自动锁定闲置时长
                    </div>
                    {autoLockOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAutoLockMinutes(opt.value);
                          setShowAutoLockMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-vault-800 transition-colors ${
                          autoLockMinutes === opt.value
                            ? 'text-vault-gold font-medium'
                            : 'text-slate-300'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {autoLockMinutes === opt.value && (
                          <span className="w-1.5 h-1.5 rounded-full bg-vault-gold"></span>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-vault-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          resetInactivityTimer();
                          setShowAutoLockMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-vault-800"
                      >
                        重置当前闲置计时器
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>

              {/* Lock Button */}
              <button
                type="button"
                onClick={lockVault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 border border-vault-700 hover:border-vault-rose/50 text-xs font-medium text-slate-300 hover:text-vault-rose transition-all shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-vault-gold" />
                <span>立即锁定</span>
              </button>
            </>
          )}

          {status === 'locked' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-900 border border-vault-700 text-xs font-mono text-slate-400">
              <Lock className="w-3.5 h-3.5 text-vault-gold" />
              <span>保险库已锁</span>
            </div>
          )}

          {status === 'not-initialized' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-900 border border-vault-700 text-xs text-slate-400">
              <Unlock className="w-3.5 h-3.5 text-slate-500" />
              <span>待初始化</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
