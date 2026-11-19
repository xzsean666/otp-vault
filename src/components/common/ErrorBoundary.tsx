import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Trash2 } from 'lucide-react';
import { clearVault } from '../../lib/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in vault app:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetAndReload = async () => {
    if (window.confirm('此操作将永久抹除本地保险库并刷新页面，确定继续吗？')) {
      try {
        await clearVault();
        localStorage.clear();
      } catch (err) {
        console.error('Failed to clear storage:', err);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-vault-950 flex items-center justify-center p-4 text-slate-100 font-sans">
          <div className="w-full max-w-lg rounded-2xl bg-vault-900 border border-rose-500/40 p-8 shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-center text-white mb-2">
              保险库运行时发生意外错误
            </h1>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              客户端遇到未处理的异常。为了保障您的双因子数据安全，已自动阻断渲染。
            </p>

            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-vault-950 border border-vault-800 font-mono text-xs text-rose-300/90 mb-6 overflow-x-auto">
                <p className="font-semibold text-rose-400 mb-1">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap mt-2 max-h-36 overflow-y-auto">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-950 font-semibold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-vault-gold/20"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新加载页面</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="py-2.5 px-4 rounded-xl bg-vault-850 hover:bg-rose-500/20 border border-vault-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>抹除数据并重置</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
