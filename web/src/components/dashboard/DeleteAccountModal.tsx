import React, { useState } from 'react';
import { toast } from 'sonner';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}: DeleteAccountModalProps) {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    await onConfirm();
  };

  const handleClose = () => {
    setDeleteConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-[calc(100%-2rem)] max-w-md overflow-hidden shadow-2xl p-5 sm:p-8">
        <h3 className="text-2xl font-black text-red-600 mb-2">Delete Account</h3>
        <p className="text-gray-600 font-medium mb-4">
          This will permanently delete your account, profiles, all registered applications, and all history.
        </p>
        <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
          <label className="text-sm font-bold text-red-800 block mb-2">Type "DELETE" to confirm</label>
          <input 
            type="text"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-red-200 focus:ring-2 focus:ring-red-500 font-bold"
            placeholder="DELETE"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
          <button 
            onClick={handleClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all flex items-center justify-center disabled:opacity-50"
            disabled={isDeleting || deleteConfirmText !== 'DELETE'}
          >
            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
