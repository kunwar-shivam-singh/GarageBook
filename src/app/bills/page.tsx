import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import BillsList from './BillsList';

export const revalidate = 0; // Dynamic server rendering

export default async function RecentBillsPage() {
  // Resolve active tenant garage ID on server
  const garageId = await getActiveGarageId();

  // Load settings and recent bills using request-specific client
  const supabase = await createClient();
  const settings = await db.getGarageSettings(garageId, supabase);
  const garageName = settings?.name || 'GarageBook';
  
  const bills = await db.getRecentBills(garageId, 50, supabase);

  return <BillsList initialBills={bills} garageName={garageName} />;
}
