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
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  const titleColors = {
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900',
  };

  return (
    <div
      className={`
        border rounded-lg p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300
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
