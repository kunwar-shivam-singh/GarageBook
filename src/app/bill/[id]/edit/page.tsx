import React from 'react';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BillForm from '../../../components/BillForm';

export const revalidate = 0; // Dynamic server rendering

interface EditBillPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBillPage({ params }: EditBillPageProps) {
  const resolvedParams = await params;
  const billId = resolvedParams.id;

  // Resolve active tenant garage ID on the server
  const garageId = await getActiveGarageId();

  // Create request-specific client for RLS authentication
  const supabase = await createClient();

  // Load existing bill details for this specific garage
  const bill = await db.getBillById(garageId, billId, supabase);
  if (!bill) {
    notFound();
  }

  // Load garage settings
  const settings = await db.getGarageSettings(garageId, supabase);
  const garageName = settings?.name || 'GarageBook';

  return (
    <BillForm 
      bill={bill} 
      garageName={garageName} 
    />
  );
}
