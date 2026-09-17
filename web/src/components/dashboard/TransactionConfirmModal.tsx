import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface TransactionConfirmModalProps {
  isOpen: boolean;
  type: 'success' | 'warning';
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function TransactionConfirmModal({
  isOpen,
  type,
  title,
  description,
  confirmText = "Yes, Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}: TransactionConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-slate-500 font-medium mb-8">
            {description}
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
            <button 
              onClick={onCancel}
              className="w-full sm:flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm transition-colors"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className={`w-full sm:flex-1 text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors ${type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/25' : 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/25'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
