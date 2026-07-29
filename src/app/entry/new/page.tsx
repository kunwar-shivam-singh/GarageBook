import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import NewEntryClient from './NewEntryClient';

export const revalidate = 0; // Dynamic server rendering

export default async function NewEntryPage() {
  // Resolve active tenant garage ID on the server
  const garageId = await getActiveGarageId();

  // Load garage settings on server using request-specific client
  const supabase = await createClient();
  const settings = await db.getGarageSettings(garageId, supabase);
  const garageName = settings?.name || 'GarageBook';

  return (
    <NewEntryClient 
      garageName={garageName} 
    />
  );
}
