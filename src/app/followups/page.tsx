import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import FollowupsList from './FollowupsList';

export const revalidate = 0; // Dynamic server rendering

export default async function FollowupsPage() {
  const garageId = await getActiveGarageId();
  const supabase = await createClient();

  const settings = await db.getGarageSettings(garageId, supabase);
  const garageName = settings?.name || 'GarageBook';

  // Load bills to filter pending amounts (Priority 11)
  const bills = await db.getRecentBills(garageId, 500, supabase);
  const pendingBills = bills.filter(b => Number(b.remainingAmount || 0) > 0 || Boolean(b.followupReminderDate || b.expectedPaymentDate));

  return (
    <FollowupsList 
      initialBills={pendingBills} 
      garageName={garageName} 
    />
  );
}
