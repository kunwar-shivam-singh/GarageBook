import React from 'react';
import { db } from '@/lib/db';
import type { Bill } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './components/DashboardClient';

export const revalidate = 0; // Dynamic server rendering

export default async function DashboardPage() {
  // Resolve active tenant garage ID on the server
  const garageId = await getActiveGarageId();

  // Fetch active settings and bills for the logged-in garage
  const supabase = await createClient();
  const settings = await db.getGarageSettings(garageId, supabase);
  const bills = await db.getRecentBills(garageId, 1000, supabase);
  const serviceJobs = await db.getServiceJobs(garageId, supabase);

  // Cast serviceJobs as bills since they share the same schema properties
  const combined = [
    ...serviceJobs.map(job => ({ ...job, invoiceNumber: '' })),
    ...bills
  ] as unknown as Bill[];

  return (
    <DashboardClient 
      initialBills={combined} 
      settings={settings} 
    />
  );
}
