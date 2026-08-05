'use client';

import React from 'react';
import { Bike, Plus, X, ChevronRight } from 'lucide-react';
import { Vehicle } from '@/lib/db/types';

interface SelectVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onAddNewVehicle: () => void;
}

export default function SelectVehicleModal({
  isOpen,
  onClose,
  customerName,
  vehicles,
  onSelectVehicle,
  onAddNewVehicle
}: SelectVehicleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-blue-600 p-5 flex justify-between items-start text-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">Registered Customer</span>
            <h3 className="font-extrabold text-xl text-white mt-0.5">{customerName}</h3>
            <p className="text-xs font-semibold text-blue-100 mt-1">Select an existing vehicle or add a new one to proceed.</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 bg-slate-50 max-h-[60vh] overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Associated Vehicles ({vehicles.length})
          </div>

          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVehicle(v)}
              className="w-full text-left p-4 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-sm group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Bike className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">{v.brand} {v.model}</div>
                  <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">{v.vehicleNumber}</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddNewVehicle();
            }}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add New Vehicle For This Customer
          </button>
        </div>
      </div>
    </div>
  );
}
