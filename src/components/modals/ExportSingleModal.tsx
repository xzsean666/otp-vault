import React, { useState, useEffect } from 'react';
import { TotpAccount } from '../../types/vault';
import { buildOtpauthUri } from '../../lib/otpauth';
import { generateQrCodeDataUrl } from '../../lib/qrcode';
import {
  X,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  QrCode,
  ShieldAlert,
} from 'lucide-react';

interface ExportSingleModalProps {
  account: TotpAccount;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportSingleModal: React.FC<ExportSingleModalProps> = ({
  account,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUri, setCopiedUri] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);

  const uri = buildOtpauthUri(account);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      generateQrCodeDataUrl(uri, {
        width: 320,
        margin: 2,
        darkColor: '#070A0F',
        lightColor: '#FFFFFF',
      })
        .then(setQrDataUrl)
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
          setQrDataUrl('');
        });
    }
  }, [isOpen, uri]);

  if (!isOpen) return null;

  const handleCopyUri = async () => {
    await navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(account.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `totp-${account.issuer || 'account'}-${account.label}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-vault-900 border border-vault-700/80 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-vault-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <QrCode className="w-5 h-5 text-vault-gold" />
            <span>导出 / 扫描二维码</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-vault-950 border border-vault-800">
            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl shadow-xl">
                <img
                  src={qrDataUrl}
                  alt="TOTP QR Code"
                  className="w-48 h-48 block"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-500 font-mono">
                生成二维码中...
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {account.issuer ? `${account.issuer} (${account.label})` : account.label}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-vault-800 text-slate-400">
                {account.algorithm} · {account.digits || 6}位 · {account.period || 30}s
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 border border-vault-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-vault-gold" />
              <span>下载二维码图片 (PNG)</span>
            </button>
          </div>

          {/* Secret Key Row */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
              密钥明文 (Secret Key)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-vault-950 border border-vault-700 font-mono text-xs text-slate-200 select-all truncate">
                {showSecret ? account.secret : '••••••••••••••••••••••••'}
              </div>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 rounded-xl bg-vault-850 border border-vault-700 text-slate-400 hover:text-white transition-colors"
                title={showSecret ? '隐藏密钥' : '显示密钥'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-2 rounded-xl bg-vault-850 border border-vault-700 text-slate-400 hover:text-white transition-colors"
                title="复制密钥"
              >
                {copiedSecret ? <Check className="w-4 h-4 text-vault-emerald" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* otpauth URI Row */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
              标准 otpauth 协议链接
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={uri}
                className="flex-1 px-3 py-2 rounded-xl bg-vault-950 border border-vault-700 font-mono text-xs text-slate-300 select-all truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyUri}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vault-850 hover:bg-vault-800 border border-vault-700 text-xs text-slate-200 hover:text-white transition-colors"
              >
                {copiedUri ? (
                  <>
                    <Check className="w-4 h-4 text-vault-emerald" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-vault-gold" />
                    <span>复制链接</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3 rounded-xl bg-vault-950/60 border border-vault-700/60 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-vault-gold flex-shrink-0 mt-0.5" />
            <span>
              双因子私钥与二维码等同于您账户的第二层密码，请切勿将其泄露或通过未加密的网络渠道传输。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
