'use client';

import React, { useState } from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface DiscardConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  vehicleNumber?: string;
}

const PRESET_REASONS = [
  "Customer will come later",
  "Customer cancelled",
  "Duplicate Entry",
  "Other"
];

export default function DiscardConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  vehicleNumber
}: DiscardConfirmModalProps) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' ? (customReason.trim() || 'Other reason') : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-red-50 border-b border-red-100 p-5 flex justify-between items-start">
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertOctagon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Discard Vehicle From Queue</h3>
              <p className="text-xs font-semibold text-red-700/80 mt-0.5 leading-relaxed">
                {vehicleNumber ? `Vehicle ${vehicleNumber}` : 'This job card'} will be removed from active service queues. It will be stored under history logs.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-red-700/50 hover:text-red-700 hover:bg-red-100/50 p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4 bg-white">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Reason for Discarding (Optional)
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            >
              {PRESET_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify reason..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Back to Queue
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20 transition-all active:scale-95"
            >
              Confirm Discard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
