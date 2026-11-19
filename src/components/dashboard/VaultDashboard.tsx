import React, { useState, useMemo } from 'react';
import { useVault } from '../../context/VaultContext';
import { TotpAccount } from '../../types/vault';
import { TotpCard } from './TotpCard';
import { ImportModal } from '../modals/ImportModal';
import { ExportSingleModal } from '../modals/ExportSingleModal';
import { ExportBatchModal } from '../modals/ExportBatchModal';
import { EditModal } from '../modals/EditModal';
import {
  Plus,
  Download,
  Search,
  X,
  Star,
  Layers,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const VaultDashboard: React.FC = () => {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    importAccounts,
  } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all');

  // Modals state
  const [importOpen, setImportOpen] = useState(false);
  const [batchExportOpen, setBatchExportOpen] = useState(false);
  const [exportSingleAccount, setExportSingleAccount] = useState<TotpAccount | null>(null);
  const [editingAccount, setEditingAccount] = useState<TotpAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter and sort accounts
  const filteredAccounts = useMemo(() => {
    let list = [...accounts];

    // Filter by tab
    if (filterTab === 'favorites') {
      list = list.filter((a) => !!a.favorite);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => {
        const matchLabel = a.label.toLowerCase().includes(q);
        const matchIssuer = a.issuer ? a.issuer.toLowerCase().includes(q) : false;
        const matchTags = a.tags ? a.tags.some((t) => t.toLowerCase().includes(q)) : false;
        return matchLabel || matchIssuer || matchTags;
      });
    }

    // Sort: Favorites first, then alphabetical by issuer/label
    list.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      const nameA = (a.issuer || a.label).toLowerCase();
      const nameB = (b.issuer || b.label).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return list;
  }, [accounts, filterTab, searchQuery]);

  const favoritesCount = useMemo(
    () => accounts.filter((a) => !!a.favorite).length,
    [accounts]
  );

  const confirmDelete = async () => {
    if (!deletingId) return;
    await deleteAccount(deletingId);
    setDeletingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
        {/* Left: Search Bar & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索发行方、账户或标签..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-vault-900 border border-vault-700 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold text-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-vault-900 border border-vault-800">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                filterTab === 'all'
                  ? 'bg-vault-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>全部 ({accounts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                filterTab === 'favorites'
                  ? 'bg-vault-800 text-vault-gold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>已收藏 ({favoritesCount})</span>
            </button>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setBatchExportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-vault-900 hover:bg-vault-850 border border-vault-700 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-vault-gold" />
            <span>备份导出</span>
          </button>

          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 text-xs font-semibold hover:brightness-110 active:scale-[0.99] transition-all flex items-center gap-1.5 shadow-lg shadow-vault-gold/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>添加 / 导入</span>
          </button>
        </div>
      </div>

      {/* Main Grid or Empty States */}
      {filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => (
            <TotpCard
              key={account.id}
              account={account}
              onExportSingle={(acc) => setExportSingleAccount(acc)}
              onEdit={(acc) => setEditingAccount(acc)}
              onDelete={(id) => setDeletingId(id)}
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        /* Empty State (No accounts added yet) */
        <div className="rounded-2xl border border-vault-800 bg-vault-950/60 p-12 text-center max-w-lg mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-vault-850 border border-vault-700/80 flex items-center justify-center text-vault-gold mx-auto mb-4 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            保险库空空如也
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            您尚未添加任何双因子动态口令密钥。支持手动输入密钥向导、粘贴 otpauth 链接、扫描/上传二维码或导入历史备份。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 shadow-lg shadow-vault-gold/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>添加第一条密钥</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Search Results */
        <div className="rounded-2xl border border-vault-800 bg-vault-950/60 p-12 text-center max-w-md mx-auto">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-white mb-1">
            未找到匹配的账户
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            没有找到与 “{searchQuery}” 相符的条目
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-3 py-1.5 rounded-lg bg-vault-850 border border-vault-700 text-xs text-slate-300 hover:text-white"
          >
            清空搜索条件
          </button>
        </div>
      )}

      {/* Security Tip Footer */}
      <div className="mt-12 pt-6 border-t border-vault-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-vault-gold" />
          <span>数据全流程经 PBKDF2 + AES-GCM-256 加密存于本机 IndexedDB</span>
        </div>
        <div>
          <span>页面关闭或锁定时，解密密钥自动从内存销毁</span>
        </div>
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onAddAccount={addAccount}
        onBatchImport={importAccounts}
      />

      {exportSingleAccount && (
        <ExportSingleModal
          account={exportSingleAccount}
          isOpen={!!exportSingleAccount}
          onClose={() => setExportSingleAccount(null)}
        />
      )}

      <ExportBatchModal
        accounts={accounts}
        isOpen={batchExportOpen}
        onClose={() => setBatchExportOpen(false)}
      />

      {editingAccount && (
        <EditModal
          account={editingAccount}
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={updateAccount}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-vault-900 border border-rose-500/40 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-2">
              确认删除该密钥？
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              删除后，此密钥将立即从本地加密保险库中移除。若您在对应服务中未备份其他验证手段，可能导致无法登录！
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-vault-700 text-slate-300 text-xs font-medium hover:bg-vault-800 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
