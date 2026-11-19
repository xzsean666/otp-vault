import React, { useState, useEffect } from 'react';
import { TotpAccount } from '../../types/vault';
import { X, Save, Edit3 } from 'lucide-react';

interface EditModalProps {
  account: TotpAccount;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<TotpAccount>) => Promise<void>;
}

export const EditModal: React.FC<EditModalProps> = ({
  account,
  isOpen,
  onClose,
  onSave,
}) => {
  const [label, setLabel] = useState(account.label);
  const [issuer, setIssuer] = useState(account.issuer || '');
  const [tagsInput, setTagsInput] = useState((account.tags || []).join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLabel(account.label);
    setIssuer(account.issuer || '');
    setTagsInput((account.tags || []).join(', '));
  }, [account]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setSaving(true);
    try {
      const tags = tagsInput
        .split(/[,， ]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      await onSave(account.id, {
        label: label.trim(),
        issuer: issuer.trim() || undefined,
        tags,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-vault-900 border border-vault-700/80 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-vault-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Edit3 className="w-4 h-4 text-vault-gold" />
            <span>编辑双因子账户</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
              发行商 / 平台 (Issuer)
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="例如: GitHub, Google, AWS"
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
              账户标识 / 邮箱 (Account Label)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例如: user@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono tracking-wider">
              分类标签 (用逗号分隔)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="例如: 工作, 运维, 财务"
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-950 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold text-sm"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-vault-700 text-slate-300 text-xs font-medium hover:bg-vault-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !label.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 text-xs font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '保存中...' : '保存更改'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
