'use client';

import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, HelpCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Định nghĩa kiểu dữ liệu cho Dialog
type DialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface DialogOptions {
  title?: string;
  type?: DialogType;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (value: boolean) => void;
}

interface DialogContextProps {
  showAlert: (message: string, options?: Omit<DialogOptions, 'cancelLabel'>) => Promise<boolean>;
  showConfirm: (message: string, options?: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const showAlert = (message: string, options?: Omit<DialogOptions, 'cancelLabel'>) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        type: options?.type || 'info',
        title: options?.title || (options?.type === 'error' ? 'Lỗi' : options?.type === 'success' ? 'Thành công' : 'Thông báo'),
        message,
        confirmLabel: options?.confirmLabel || 'Đóng',
        cancelLabel: '', // Alert không có nút hủy
        resolve,
      });
    });
  };

  const showConfirm = (message: string, options?: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        type: options?.type || 'confirm',
        title: options?.title || 'Xác nhận',
        message,
        confirmLabel: options?.confirmLabel || 'Xác nhận',
        cancelLabel: options?.cancelLabel || 'Hủy',
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  };

  const handleCancel = () => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  };

  // Lựa chọn Icon & Màu sắc dựa theo loại Dialog
  const getIcon = (type: DialogType) => {
    const iconSize = 28;
    switch (type) {
      case 'success':
        return <CheckCircle2 size={iconSize} className="text-emerald-400" />;
      case 'error':
        return <AlertTriangle size={iconSize} className="text-rose-400" />;
      case 'warning':
        return <AlertTriangle size={iconSize} className="text-amber-400" />;
      case 'confirm':
        return <HelpCircle size={iconSize} className="text-sky-400" />;
      case 'info':
      default:
        return <Info size={iconSize} className="text-blue-400" />;
    }
  };

  const getHeaderGradient = (type: DialogType) => {
    switch (type) {
      case 'success':
        return 'from-emerald-500 to-teal-500';
      case 'error':
        return 'from-rose-500 to-red-600';
      case 'warning':
        return 'from-amber-500 to-yellow-500';
      case 'confirm':
        return 'from-sky-500 to-blue-600';
      case 'info':
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <AnimatePresence>
        {state && state.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Background Backdrop mờ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={state.cancelLabel ? handleCancel : handleConfirm}
              className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-[#12141c]/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.6)] text-white z-10"
            >
              {/* Dải gradient phía trên */}
              <div className={twMerge('h-1.5 w-full bg-gradient-to-r', getHeaderGradient(state.type))} />

              {/* Nút đóng nhanh ở góc phải */}
              <button
                onClick={handleCancel}
                className="absolute top-3 right-3 text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="p-6 space-y-4">
                {/* Header với Icon và Tiêu đề */}
                <div className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(state.type)}</div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {state.title}
                    </h3>
                    <p className="text-sm text-gray-300 font-medium leading-relaxed break-words whitespace-pre-line">
                      {state.message}
                    </p>
                  </div>
                </div>

                {/* Footer chứa các Nút hành động */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  {state.cancelLabel && (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
                    >
                      {state.cancelLabel}
                    </button>
                  )}
                  <button
                    onClick={handleConfirm}
                    className={clsx(
                      "px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer active:scale-95",
                      state.type === 'success' && 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20',
                      state.type === 'error' && 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20',
                      state.type === 'warning' && 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/20',
                      state.type === 'confirm' && 'bg-sky-600 hover:bg-sky-500 shadow-sky-950/20',
                      state.type === 'info' && 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/20'
                    )}
                  >
                    {state.confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}
