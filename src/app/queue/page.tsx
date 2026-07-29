import React from 'react';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getOpenServiceQueue, getMechanics, getSettings } from '@/app/actions';
import QueueClient from './QueueClient';

export const revalidate = 0; // Dynamic rendering

export default async function QueuePage() {
  // Trigger active garage ID resolution and auth validation
  await getActiveGarageId();

  // Load initial open jobs, mechanics lists, and settings
  const initialQueue = await getOpenServiceQueue();
  const initialMechanics = await getMechanics();
  const settings = await getSettings();
  const garageName = settings?.name || 'GarageBook';

  return (
    <QueueClient 
      initialQueue={initialQueue} 
      initialMechanics={initialMechanics} 
      garageName={garageName}
    />
  );
}
