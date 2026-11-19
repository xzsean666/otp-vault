import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TotpAccount, TotpAlgorithm } from '../../types/vault';
import { normalizeBase32, isValidBase32 } from '../../lib/base32';
import { parseOtpauthUri } from '../../lib/otpauth';
import { generateTotp } from '../../lib/totp';
import { decryptVaultData } from '../../lib/crypto';
import {
  decodeQrCodeFromFile,
  scanQrFromVideo,
} from '../../lib/qrcode';
import {
  X,
  Key,
  Link,
  QrCode,
  FileText,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (
    account: Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onBatchImport: (
    accounts: Array<Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ added: number; skipped: number }>;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onAddAccount,
  onBatchImport,
}) => {
  const [tab, setTab] = useState<'wizard' | 'url' | 'qr' | 'batch'>('wizard');

  // Tab 1: Wizard state
  const [secret, setSecret] = useState('');
  const [label, setLabel] = useState('');
  const [issuer, setIssuer] = useState('');
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>('SHA-1');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewOtp, setPreviewOtp] = useState<string>('');

  // Tab 2: URL state
  const [rawUrl, setRawUrl] = useState('');
  const [parsedFromUrl, setParsedFromUrl] = useState<Omit<
    TotpAccount,
    'id' | 'createdAt' | 'updatedAt'
  > | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Tab 3: QR state
  const [qrScanning, setQrScanning] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrParsed, setQrParsed] = useState<Omit<
    TotpAccount,
    'id' | 'createdAt' | 'updatedAt'
  > | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tab 4: Batch state
  const [batchText, setBatchText] = useState('');
  const [encryptedPassword, setEncryptedPassword] = useState('');
  const [isEncryptedPayload, setIsEncryptedPayload] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    added: number;
    skipped: number;
  } | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Common issuer presets
  const presets = ['GitHub', 'Google', 'Microsoft', 'AWS', 'Cloudflare', 'Binance'];

  // Check if batchText looks like an EncryptedVaultPayload
  useEffect(() => {
    const trimmed = batchText.trim();
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && obj.ciphertext && obj.salt && obj.iv) {
          setIsEncryptedPayload(true);
          return;
        }
      } catch {
        // Not valid JSON yet
      }
    }
    setIsEncryptedPayload(false);
  }, [batchText]);

  // Update live preview in wizard
  useEffect(() => {
    const cleanSecret = normalizeBase32(secret);
    if (isValidBase32(cleanSecret)) {
      generateTotp(cleanSecret, {
        algorithm,
        digits,
        period,
      })
        .then(setPreviewOtp)
        .catch(() => setPreviewOtp(''));
    } else {
      setPreviewOtp('');
    }
  }, [secret, algorithm, digits, period]);

  // Handle URL parsing in real-time
  useEffect(() => {
    if (!rawUrl.trim()) {
      setParsedFromUrl(null);
      setUrlError(null);
      return;
    }
    try {
      const parsed = parseOtpauthUri(rawUrl.trim());
      setParsedFromUrl({
        label: parsed.label,
        issuer: parsed.issuer,
        secret: parsed.secret,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        period: parsed.period,
      });
      setUrlError(null);
    } catch (err: any) {
      setParsedFromUrl(null);
      setUrlError(err?.message || '无法解析的 otpauth 链接');
    }
  }, [rawUrl]);

  // Camera QR scanning cleanup
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setQrScanning(false);
  }, []);

  // Reactive camera cleanup: stop camera if modal is closed or tab is not 'qr'
  useEffect(() => {
    if (!isOpen || tab !== 'qr') {
      stopCamera();
    }
  }, [isOpen, tab, stopCamera]);

  // Synchronize mediaStream to video element once qrScanning is active and video element is mounted
  useEffect(() => {
    if (qrScanning && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video play interrupted:', err);
      });
    }
  }, [qrScanning]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCamera();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, stopCamera]);

  const startCamera = async () => {
    setQrError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      setQrScanning(true);

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      scanIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          const decoded = scanQrFromVideo(videoRef.current);
          if (decoded) {
            stopCamera();
            handleQrDecodedString(decoded);
          }
        }
      }, 300);
    } catch (err: any) {
      setQrError('无法访问摄像头，请检查权限或改用图片上传');
      stopCamera();
    }
  };

  const handleQrDecodedString = (decoded: string) => {
    try {
      const parsed = parseOtpauthUri(decoded);
      setQrParsed({
        label: parsed.label,
        issuer: parsed.issuer,
        secret: parsed.secret,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        period: parsed.period,
      });
      setQrError(null);
    } catch (err: any) {
      setQrError('二维码中不是有效的 otpauth 动态口令协议');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrError(null);
    try {
      const decoded = await decodeQrCodeFromFile(file);
      if (decoded) {
        handleQrDecodedString(decoded);
      } else {
        setQrError('未能在该图片中识别出有效的二维码，请尝试更换清晰图片');
      }
    } catch (err: any) {
      setQrError(err?.message || '图片读取失败');
    }
  };

  // Paste image handler for QR tab
  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            const decoded = await decodeQrCodeFromFile(file);
            if (decoded) {
              handleQrDecodedString(decoded);
            } else {
              setQrError('未能从剪贴板图片中识别二维码');
            }
          } catch (err: any) {
            setQrError('剪贴板图像解码失败');
          }
        }
        break;
      }
    }
  };

  if (!isOpen) return null;

  // Submit Handler for Wizard
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSecret = normalizeBase32(secret);
    if (!isValidBase32(cleanSecret)) return;
    if (!label.trim()) return;

    setSubmitting(true);
    try {
      await onAddAccount({
        label: label.trim(),
        issuer: issuer.trim() || undefined,
        secret: cleanSecret,
        algorithm,
        digits,
        period,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler for URL
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedFromUrl) return;

    setSubmitting(true);
    try {
      await onAddAccount(parsedFromUrl);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler for QR
  const handleQrSubmit = async () => {
    if (!qrParsed) return;
    setSubmitting(true);
    try {
      await onAddAccount(qrParsed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler for Batch
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;

    setSubmitting(true);
    setBatchError(null);
    setBatchResult(null);

    const itemsToImport: Array<Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const text = batchText.trim();

    try {
      // Check if text is JSON
      if (text.startsWith('{') || text.startsWith('[')) {
        const parsedJson = JSON.parse(text);

        // Check if this is an EncryptedVaultPayload
        if (parsedJson && parsedJson.ciphertext && parsedJson.salt && parsedJson.iv) {
          if (!encryptedPassword) {
            setBatchError('检测到加密备份，请输入对应的解锁密码');
            return;
          }
          const decryptedAccounts = await decryptVaultData(parsedJson, encryptedPassword);
          for (const item of decryptedAccounts) {
            if (item.secret && isValidBase32(normalizeBase32(item.secret))) {
              itemsToImport.push({
                label: item.label || 'Account',
                issuer: item.issuer || undefined,
                secret: normalizeBase32(item.secret),
                algorithm: item.algorithm || 'SHA-1',
                digits: item.digits || 6,
                period: item.period || 30,
                tags: item.tags || [],
                favorite: !!item.favorite,
              });
            }
          }
        } else {
          const list = Array.isArray(parsedJson)
            ? parsedJson
            : parsedJson.accounts || [];

          for (const item of list) {
            if (item.secret && isValidBase32(normalizeBase32(item.secret))) {
              itemsToImport.push({
                label: item.label || 'Account',
                issuer: item.issuer || undefined,
                secret: normalizeBase32(item.secret),
                algorithm: item.algorithm || 'SHA-1',
                digits: item.digits || 6,
                period: item.period || 30,
                tags: item.tags || [],
                favorite: !!item.favorite,
              });
            }
          }
        }
      } else {
        // Line by line otpauth URLs
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().startsWith('otpauth://')) {
            try {
              const p = parseOtpauthUri(trimmed);
              itemsToImport.push({
                label: p.label,
                issuer: p.issuer,
                secret: p.secret,
                algorithm: p.algorithm,
                digits: p.digits,
                period: p.period,
              });
            } catch {
              // skip invalid lines
            }
          }
        }
      }

      if (itemsToImport.length === 0) {
        setBatchError('未识别到任何有效的 TOTP 记录或 otpauth 链接');
        return;
      }

      const res = await onBatchImport(itemsToImport);
      setBatchResult(res);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setBatchError(err?.message || '批量解析失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onPaste={tab === 'qr' ? handlePasteImage : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-vault-900 border border-vault-700/80 p-6 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-vault-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Key className="w-5 h-5 text-vault-gold" />
            <span>添加 / 导入 TOTP 密钥</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-vault-950 border border-vault-800 mb-5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setTab('wizard');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'wizard'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>私钥向导</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setTab('url');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'url'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>URI 链接</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('qr')}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'qr'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>二维码</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setTab('batch');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              tab === 'batch'
                ? 'bg-vault-850 text-vault-gold border border-vault-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>批量导入</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* TAB 1: Secret Key Wizard */}
          {tab === 'wizard' && (
            <form onSubmit={handleWizardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
                  密钥 (Base32 Secret) <span className="text-vault-gold">*</span>
                </label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="例如: JBSWY3DPEHPK3PXP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold uppercase"
                  autoFocus
                  required
                />
                {secret && !isValidBase32(normalizeBase32(secret)) && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    密钥格式不正确 (仅支持英文字母 A-Z 与数字 2-7)
                  </p>
                )}
              </div>

              {/* Issuer selection with presets */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
                  平台 / 发行方 (Issuer)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIssuer(p)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        issuer === p
                          ? 'bg-vault-gold/20 border-vault-gold text-vault-gold font-medium'
                          : 'bg-vault-950 border-vault-800 text-slate-400 hover:text-white hover:border-vault-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="例如: GitHub, Google, 自建服务"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold text-sm"
                />
              </div>

              {/* Account Label */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
                  账户标识 / 邮箱 (Account Label) <span className="text-vault-gold">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="例如: username@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold text-sm"
                  required
                />
              </div>

              {/* Collapsible Advanced Settings */}
              <div className="border border-vault-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-3.5 py-2.5 bg-vault-950 text-xs text-slate-400 hover:text-white flex items-center justify-between font-mono"
                >
                  <span>算法高级选项 (算法: {algorithm}, {digits}位, {period}s)</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvanced && (
                  <div className="p-3.5 bg-vault-950/80 border-t border-vault-800 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                          哈希算法
                        </label>
                        <select
                          value={algorithm}
                          onChange={(e) => setAlgorithm(e.target.value as TotpAlgorithm)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-vault-900 border border-vault-700 text-xs text-white focus:outline-none focus:border-vault-gold"
                        >
                          <option value="SHA-1">SHA-1 (常用)</option>
                          <option value="SHA-256">SHA-256</option>
                          <option value="SHA-512">SHA-512</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                          口令位数
                        </label>
                        <select
                          value={digits}
                          onChange={(e) => setDigits(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-vault-900 border border-vault-700 text-xs text-white focus:outline-none focus:border-vault-gold"
                        >
                          <option value={6}>6 位 (标准)</option>
                          <option value={8}>8 位</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                          步长周期
                        </label>
                        <select
                          value={period}
                          onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-vault-900 border border-vault-700 text-xs text-white focus:outline-none focus:border-vault-gold"
                        >
                          <option value={30}>30 秒 (标准)</option>
                          <option value={60}>60 秒</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Code Preview */}
              {previewOtp && (
                <div className="p-3 rounded-xl bg-vault-850 border border-vault-gold/30 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-mono">实时动态口令试算</span>
                    <span className="text-xl font-bold font-mono text-vault-gold tracking-widest">
                      {previewOtp.length === 6
                        ? `${previewOtp.slice(0, 3)} ${previewOtp.slice(3)}`
                        : previewOtp}
                    </span>
                  </div>
                  <span className="text-xs text-vault-emerald flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 密钥有效
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !label.trim() || !isValidBase32(normalizeBase32(secret))}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-vault-gold/20"
              >
                {submitting ? '保存中...' : '确认添加到保险库'}
              </button>
            </form>
          )}

          {/* TAB 2: URI Import */}
          {tab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
                  粘贴 otpauth 协议链接
                </label>
                <textarea
                  rows={3}
                  value={rawUrl}
                  onChange={(e) => setRawUrl(e.target.value)}
                  placeholder="otpauth://totp/GitHub:alice?secret=JBSWY3DPEHPK3PXP&issuer=GitHub"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold"
                  autoFocus
                />
              </div>

              {urlError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              {parsedFromUrl && (
                <div className="p-4 rounded-xl bg-vault-950 border border-vault-700/80 space-y-2 text-xs">
                  <span className="text-[11px] font-mono text-vault-gold uppercase font-semibold">
                    解析结果预览
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block">发行方:</span>
                      <strong className="text-white">{parsedFromUrl.issuer || '未指定'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">账户名称:</span>
                      <strong className="text-white">{parsedFromUrl.label}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">算法 / 位数 / 周期:</span>
                      <strong className="text-white">
                        {parsedFromUrl.algorithm} · {parsedFromUrl.digits}位 · {parsedFromUrl.period}s
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">密钥明文:</span>
                      <code className="text-vault-gold font-mono truncate block">
                        {parsedFromUrl.secret}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !parsedFromUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-vault-gold/20"
              >
                {submitting ? '导入中...' : '确认导入该账户'}
              </button>
            </form>
          )}

          {/* TAB 3: QR Code */}
          {tab === 'qr' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border-2 border-dashed border-vault-700 bg-vault-950 text-center hover:border-vault-gold/60 transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-8 h-8 text-vault-gold mx-auto mb-2" />
                <p className="text-xs text-white font-medium mb-1">
                  拖拽或点击上传包含二维码的图片
                </p>
                <p className="text-[11px] text-slate-500">
                  支持快捷键直接在此窗口粘贴截图 (Ctrl+V / Cmd+V)
                </p>
              </div>

              {/* Camera Scanner */}
              <div className="text-center">
                {!qrScanning ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 border border-vault-700 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-vault-gold" />
                    <span>启动摄像头扫码</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden bg-black max-w-xs mx-auto border border-vault-700">
                      <video
                        ref={videoRef}
                        className="w-full h-48 object-cover"
                        playsInline
                      />
                      <div className="absolute inset-0 border-2 border-vault-gold/60 pointer-events-none animate-pulse m-6 rounded-lg" />
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs"
                    >
                      关闭摄像头
                    </button>
                  </div>
                )}
              </div>

              {qrError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{qrError}</span>
                </div>
              )}

              {qrParsed && (
                <div className="p-4 rounded-xl bg-vault-950 border border-vault-gold/40 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-vault-emerald font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>成功解析二维码内容</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 mt-2">
                    <div>
                      <span className="text-slate-500 block">发行方:</span>
                      <strong className="text-white">{qrParsed.issuer || '未指定'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">账户名称:</span>
                      <strong className="text-white">{qrParsed.label}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleQrSubmit}
                    disabled={submitting}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-vault-gold text-vault-950 font-semibold text-xs hover:brightness-110 transition-all"
                  >
                    {submitting ? '保存中...' : '导入此双因子账户'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Batch Import */}
          {tab === 'batch' && (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300 uppercase font-mono tracking-wider">
                  多行 otpauth 链接 或 JSON 备份文本
                </label>
                <label className="text-[11px] text-vault-gold hover:text-vault-gold-light cursor-pointer font-mono inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>上传文件 (.json / .txt)</span>
                  <input
                    type="file"
                    accept=".json,.txt,application/json,text/plain"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const content = await file.text();
                        setBatchText(content);
                        setBatchError(null);
                      } catch {
                        setBatchError('读取备份文件失败');
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <textarea
                  rows={isEncryptedPayload ? 4 : 6}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={`每行一条 otpauth://totp/... 链接，或者粘贴从本系统导出的加密/明文 JSON 备份`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold"
                  autoFocus
                />
              </div>

              {/* Encrypted backup prompt */}
              {isEncryptedPayload && (
                <div className="p-3.5 rounded-xl bg-vault-850 border border-vault-gold/40 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-semibold text-vault-gold">
                    <Lock className="w-4 h-4" />
                    <span>检测到加密保险库备份</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    此备份经过端到端加密保护。请输入创建该备份时对应的主密码以解密导入：
                  </p>
                  <input
                    type="password"
                    value={encryptedPassword}
                    onChange={(e) => setEncryptedPassword(e.target.value)}
                    placeholder="输入该备份的解锁主密码"
                    className="w-full px-3.5 py-2 rounded-lg bg-vault-950 border border-vault-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold"
                    required
                  />
                </div>
              )}

              {batchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              {batchResult && (
                <div className="p-3 rounded-xl bg-vault-emerald/10 border border-vault-emerald/30 text-vault-emerald text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>
                    成功导入 {batchResult.added} 项账户 (已跳过重复项 {batchResult.skipped} 项)
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !batchText.trim() || (isEncryptedPayload && !encryptedPassword)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-vault-gold/20"
              >
                {submitting ? '批量导入中...' : isEncryptedPayload ? '解密并批量导入' : '解析并批量导入'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
