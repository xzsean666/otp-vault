import React, { useState, useEffect, useMemo } from 'react';
import { TotpAccount, EncryptedVaultPayload } from '../../types/vault';
import { buildOtpauthUri } from '../../lib/otpauth';
import { buildGoogleMigrationPayloads } from '../../lib/googleMigration';
import { generateQrCodeDataUrl } from '../../lib/qrcode';
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
  QrCode,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
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
  const [tab, setTab] = useState<'encrypted' | 'google' | 'json' | 'uri'>('encrypted');
  const [copiedUris, setCopiedUris] = useState<boolean>(false);
  const [copiedMigrationUri, setCopiedMigrationUri] = useState<boolean>(false);
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedVaultPayload | null>(null);

  // Google migration QR pagination & image state
  const [chunkIndex, setChunkIndex] = useState<number>(0);
  const [googleQrDataUrl, setGoogleQrDataUrl] = useState<string>('');
  const [qrGenerating, setQrGenerating] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string | null>(null);

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
      setChunkIndex(0);
      loadEncryptedVault()
        .then((payload) => setEncryptedPayload(payload))
        .catch(console.error);
    }
  }, [isOpen]);

  // Build Google Authenticator migration chunks
  const migrationChunks = useMemo(() => {
    if (!isOpen || accounts.length === 0) return [];
    return buildGoogleMigrationPayloads(accounts);
  }, [isOpen, accounts]);

  const safeChunkIndex = Math.min(chunkIndex, Math.max(0, migrationChunks.length - 1));
  const activeChunk = migrationChunks[safeChunkIndex] || null;

  const nonStandardPeriodCount = useMemo(
    () => accounts.filter((a) => (a.period || 30) !== 30).length,
    [accounts]
  );

  // Generate QR code image whenever active Google migration chunk changes
  useEffect(() => {
    if (!isOpen || tab !== 'google' || !activeChunk) {
      return;
    }

    let cancelled = false;
    setQrGenerating(true);
    setQrError(null);

    generateQrCodeDataUrl(activeChunk.uri, {
      width: 340,
      margin: 2,
      darkColor: '#070A0F',
      lightColor: '#FFFFFF',
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) {
          setGoogleQrDataUrl(url);
          setQrGenerating(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to generate Google migration QR code:', err);
          setGoogleQrDataUrl('');
          setQrError('生成批量二维码失败，请重试或改用 URI 导出');
          setQrGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tab, activeChunk]);

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

  const handleDownloadGoogleQr = () => {
    if (!googleQrDataUrl || !activeChunk) return;
    const a = document.createElement('a');
    a.href = googleQrDataUrl;
    const suffix =
      migrationChunks.length > 1
        ? `-part-${activeChunk.batchIndex + 1}-of-${activeChunk.batchSize}`
        : '';
    a.download = `google-authenticator-export-${new Date().toISOString().slice(0, 10)}${suffix}.png`;
    a.click();
  };

  const handleCopyMigrationUri = async () => {
    if (!activeChunk) return;
    await navigator.clipboard.writeText(activeChunk.uri);
    setCopiedMigrationUri(true);
    setTimeout(() => setCopiedMigrationUri(false), 2000);
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
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-vault-950 border border-vault-800 mb-5 flex-shrink-0">
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
            <span>加密备份</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('google')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'google'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Google 二维码</span>
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
                  <strong>加密安全备份：</strong>
                  直接导出受主密码保护的完整密文备份。可安全存放于云盘或 U 盘，无主密码无法解密。
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

          {tab === 'google' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                生成兼容 <strong>Google Authenticator（谷歌身份验证器）</strong> 的批量转移二维码。在手机端依次打开{' '}
                <span className="text-vault-gold">转移账号 → 导入账号 → 扫描二维码</span> 即可一次性导入。
              </p>

              {accounts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-vault-950 border border-vault-800 text-center text-xs text-slate-500">
                  当前保险库为空，暂无可导出的账户
                </div>
              ) : (
                <>
                  {nonStandardPeriodCount > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>
                        有 {nonStandardPeriodCount} 项账户的周期不是 30 秒。Google Authenticator 批量迁移协议仅支持 30 秒周期，扫码导入后将按 30 秒计算。
                      </span>
                    </div>
                  )}

                  {/* Pagination Header when split across multiple QR codes */}
                  {migrationChunks.length > 1 && activeChunk && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-vault-950 border border-vault-800">
                      <button
                        type="button"
                        onClick={() => setChunkIndex((idx) => Math.max(0, idx - 1))}
                        disabled={safeChunkIndex === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 border border-vault-700 text-xs text-slate-200 disabled:opacity-40 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>上一张</span>
                      </button>

                      <div className="text-center">
                        <span className="text-xs font-semibold text-vault-gold">
                          第 {safeChunkIndex + 1} / {migrationChunks.length} 张二维码
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          本张包含 {activeChunk.accounts.length} 个账户（已自动分片以确保清晰可扫）
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setChunkIndex((idx) => Math.min(migrationChunks.length - 1, idx + 1))
                        }
                        disabled={safeChunkIndex === migrationChunks.length - 1}
                        className="px-2.5 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 border border-vault-700 text-xs text-slate-200 disabled:opacity-40 flex items-center gap-1"
                      >
                        <span>下一张</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* QR Code Card */}
                  <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-vault-950 border border-vault-800">
                    {qrError ? (
                      <div className="w-52 h-52 flex items-center justify-center text-center text-xs text-rose-400 px-4">
                        {qrError}
                      </div>
                    ) : qrGenerating || !googleQrDataUrl ? (
                      <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-500 font-mono">
                        生成批量二维码中...
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl shadow-xl">
                        <img
                          src={googleQrDataUrl}
                          alt={`Google Authenticator Migration QR ${safeChunkIndex + 1}`}
                          className="w-52 h-52 block"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
                      <button
                        type="button"
                        onClick={handleCopyMigrationUri}
                        disabled={!activeChunk}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-vault-850 hover:bg-vault-800 border border-vault-700 text-xs text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {copiedMigrationUri ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-vault-emerald" />
                            <span>已复制迁移链接</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-vault-gold" />
                            <span>复制迁移链接</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadGoogleQr}
                        disabled={!googleQrDataUrl || qrGenerating}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-lg shadow-vault-gold/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {migrationChunks.length > 1
                            ? `下载第 ${safeChunkIndex + 1} 张 (PNG)`
                            : '下载二维码图片 (PNG)'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Included Accounts Preview */}
                  {activeChunk && (
                    <div className="rounded-xl bg-vault-950 border border-vault-800 p-3 space-y-1.5">
                      <div className="text-[11px] font-mono text-slate-400">
                        本二维码包含的账户 ({activeChunk.accounts.length} 项)：
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {activeChunk.accounts.map((acc, idx) => (
                          <div
                            key={`${acc.secret}-${idx}`}
                            className="text-xs text-slate-300 flex items-center justify-between gap-2 py-0.5"
                          >
                            <span className="truncate">
                              {acc.issuer ? `${acc.issuer} · ${acc.label}` : acc.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                              {acc.algorithm} · {acc.digits}位
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>安全警示：</strong>
                      批量迁移二维码包含您所有对应账户的明文私钥，扫码完成后请及时关闭窗口，切勿截屏传播。
                    </span>
                  </div>
                </>
              )}
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
