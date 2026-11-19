import React, { useState, useEffect } from 'react';
import { TotpAccount, EncryptedVaultPayload } from '../../types/vault';
import { buildOtpauthUri } from '../../lib/otpauth';
import { loadEncryptedVault } from '../../lib/storage';
import {
  X,
  Download,
  Copy,
  Check,
  FileJson,
  List,
  ShieldAlert,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface ExportBatchModalProps {
  accounts: TotpAccount[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExportBatchModal: React.FC<ExportBatchModalProps> = ({
  accounts,
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<'encrypted' | 'json' | 'uri'>('encrypted');
  const [copiedUris, setCopiedUris] = useState<boolean>(false);
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedVaultPayload | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load encrypted payload when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEncryptedVault()
        .then((payload) => setEncryptedPayload(payload))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate URI list
  const uriListText = accounts.map((acc) => buildOtpauthUri(acc)).join('\n');

  // Generate Encrypted backup text
  const encryptedBackupText = encryptedPayload
    ? JSON.stringify(encryptedPayload, null, 2)
    : '';

  // Generate Plain JSON backup text
  const jsonBackupText = JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
      accounts: accounts.map((a) => ({
        label: a.label,
        issuer: a.issuer,
        secret: a.secret,
        algorithm: a.algorithm,
        digits: a.digits,
        period: a.period,
        tags: a.tags,
        favorite: a.favorite,
      })),
    },
    null,
    2
  );

  const handleDownloadEncrypted = () => {
    if (!encryptedBackupText) return;
    const blob = new Blob([encryptedBackupText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otp-vault-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonBackupText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otp-vault-plaintext-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadUris = () => {
    const blob = new Blob([uriListText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otpauth-uris-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyUris = async () => {
    await navigator.clipboard.writeText(uriListText);
    setCopiedUris(true);
    setTimeout(() => setCopiedUris(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-vault-900 border border-vault-700/80 p-6 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-vault-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Download className="w-5 h-5 text-vault-gold" />
            <span>批量导出备份 ({accounts.length} 项)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-vault-950 border border-vault-800 mb-5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setTab('encrypted')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'encrypted'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>加密备份 (推荐)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('json')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'json'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>明文 JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('uri')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'uri'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>URI 列表</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 pr-1">
          {tab === 'encrypted' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-vault-950 border border-vault-emerald/30 flex items-start gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-vault-emerald flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>安全端到端加密：</strong>
                  直接导出受主密码保护的完整密文载荷（PBKDF2-HMAC-SHA256 + AES-GCM-256）。可安全存放于云盘、U盘或 Git 中，他人无密码无法解密。
                </span>
              </div>
              <div className="relative rounded-xl bg-vault-950 border border-vault-800 p-3 max-h-44 overflow-y-auto font-mono text-[11px] text-slate-400">
                <pre className="whitespace-pre-wrap">
                  {encryptedBackupText || '(正在读取加密保险库数据...)'}
                </pre>
              </div>
              <button
                type="button"
                onClick={handleDownloadEncrypted}
                disabled={!encryptedBackupText}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-vault-gold/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>下载加密保险库备份 (.json)</span>
              </button>
            </div>
          )}

          {tab === 'json' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                导出未加密的结构化 JSON 格式，包含标签、发行方与明文密钥。
              </p>
              <div className="relative rounded-xl bg-vault-950 border border-vault-800 p-3 max-h-44 overflow-y-auto font-mono text-[11px] text-slate-400">
                <pre className="whitespace-pre-wrap">{jsonBackupText}</pre>
              </div>
              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={accounts.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-vault-gold/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>下载明文 JSON 备份文件 (.json)</span>
              </button>

              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>安全警示：</strong>
                  此文件包含未加密的 2FA 私钥明文。请存储于离线安全介质，切勿上传公开网络。
                </span>
              </div>
            </div>
          )}

          {tab === 'uri' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                每行一条标准的 <code>otpauth://totp/...</code> 链接，兼容大部分主流双因子管理软件导入。
              </p>
              <div className="relative rounded-xl bg-vault-950 border border-vault-800 p-3 max-h-44 overflow-y-auto font-mono text-[11px] text-slate-400">
                <pre className="whitespace-pre-wrap">
                  {uriListText || '(保险库为空)'}
                </pre>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCopyUris}
                  disabled={accounts.length === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-vault-850 hover:bg-vault-800 border border-vault-700 text-slate-200 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {copiedUris ? (
                    <>
                      <Check className="w-4 h-4 text-vault-emerald" />
                      <span>已复制全部链接</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-vault-gold" />
                      <span>复制全部链接</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadUris}
                  disabled={accounts.length === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-vault-gold/20"
                >
                  <Download className="w-4 h-4" />
                  <span>下载 URI 列表 (.txt)</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>安全警示：</strong>
                  URI 链接包含明文私钥参数。请妥善保存。
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
