import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getManualImports } from '@/app/actions';
import ReportsClient from './ReportsClient';

export const revalidate = 0; // Dynamic server rendering

export default async function ReportsPage() {
  const garageId = await getActiveGarageId();
  const supabase = await createClient();

  const settings = await db.getGarageSettings(garageId, supabase);
  const bills = await db.getRecentBills(garageId, 1000, supabase);
  const imports = await getManualImports();

  return (
    <ReportsClient 
      bills={bills} 
      settings={settings} 
      imports={imports}
    />
  );
}
