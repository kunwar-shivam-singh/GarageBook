import React from 'react';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getManualImports, getSettings } from '@/app/actions';
import ImportsClient from './ImportsClient';

export const revalidate = 0; // Dynamic rendering

export default async function ImportsPage() {
  // Validate authentication session
  await getActiveGarageId();

  // Load configuration and existing historical records
  const initialImports = await getManualImports();
  const settings = await getSettings();
  const garageName = settings?.name || 'GarageBook';

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manual Invoices Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import legacy bills from paper records or spreadsheets to track outstanding customer dues.
        </p>
      </div>

      <ImportsClient 
        initialImports={initialImports} 
        garageName={garageName} 
      />
    </div>
  );
}
