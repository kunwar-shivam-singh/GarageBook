import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import WorkingClient from './WorkingClient';

export const revalidate = 0; // Dynamic server rendering

export default async function WorkingJobsPage() {
  const garageId = await getActiveGarageId();
  const supabase = await createClient();
  const settings = await db.getGarageSettings(garageId, supabase);
  const mechanics = await db.getMechanics(garageId, supabase);
  const serviceJobs = await db.getServiceJobs(garageId, supabase);
  const mappedJobs = serviceJobs.map(job => ({ ...job, invoiceNumber: '' })) as any;

  return (
    <WorkingClient 
      initialJobs={mappedJobs} 
      settings={settings}
      mechanics={mechanics}
    />
  );
}
