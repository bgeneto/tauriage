import React, { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, onClose, duration]);

  const icons = {
    success: '✓',
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  };

  const bgColors = {
    success: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    error: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    warning: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    info: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  };

  const textColors = {
    success: 'text-slate-700 dark:text-slate-300',
    error: 'text-slate-700 dark:text-slate-300',
    warning: 'text-slate-700 dark:text-slate-300',
    info: 'text-slate-700 dark:text-slate-300',
  };

  const titleColors = {
    success: 'text-slate-900 dark:text-white',
    error: 'text-slate-900 dark:text-white',
    warning: 'text-slate-900 dark:text-white',
    info: 'text-slate-900 dark:text-white',
  };

  return (
    <div
      className={`
        border rounded-lg p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg
        ${bgColors[toast.type]} ${textColors[toast.type]}
      `}
    >
      <span className="text-xl shrink-0">{icons[toast.type]}</span>
      <div className="flex-1">
        <div className={`font-semibold ${titleColors[toast.type]}`}>{toast.title}</div>
        {toast.message && <div className="text-sm mt-1">{toast.message}</div>}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 text-xl opacity-50 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
