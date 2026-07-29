import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BillReceipt from './BillReceipt';
import JobCardClient from './JobCardClient';

export const revalidate = 0; // Dynamic server rendering

interface BillPageProps {
  params: Promise<{ id: string }>;
}

export default async function BillPage({ params }: BillPageProps) {
  const resolvedParams = await params;
  const billId = resolvedParams.id;

  // Resolve active tenant garage ID on server
  const garageId = await getActiveGarageId();

  // Create request-specific client for RLS authentication
  const supabase = await createClient();

  // Load bill details on server for this specific garage
  const bill = await db.getBillById(garageId, billId, supabase);
  if (!bill) {
    notFound();
  }

  // Load garage settings on server
  const settings = await db.getGarageSettings(garageId, supabase);

  if (bill.jobStatus === 'Delivered') {
    return <BillReceipt bill={bill} settings={settings} />;
  }

  return <JobCardClient bill={bill} settings={settings} />;
}
