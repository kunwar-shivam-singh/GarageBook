'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface LabourPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLabour: () => void;
  onContinue: () => void;
  invoiceNumber?: string;
}

export default function LabourPromptModal({
  isOpen,
  onClose,
  onAddLabour,
  onContinue,
  invoiceNumber
}: LabourPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-amber-50 border-b border-amber-100 p-5 flex justify-between items-start">
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">No Labour Added</h3>
              <p className="text-xs font-semibold text-amber-700/80 mt-0.5 leading-relaxed">
                You are about to complete {invoiceNumber ? `Job Card ${invoiceNumber}` : 'this job'} without any labour charges.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-amber-700/50 hover:text-amber-700 hover:bg-amber-100/50 p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 bg-white">
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddLabour();
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-center flex items-center justify-center gap-2"
          >
            Add Labour Now
          </button>
          
          <button
            type="button"
            onClick={() => {
              onClose();
              onContinue();
            }}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all active:scale-95 text-center"
          >
            Continue Without Labour
          </button>
        </div>
      </div>
    </div>
  );
}
