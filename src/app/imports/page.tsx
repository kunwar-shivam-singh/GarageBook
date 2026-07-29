import React from 'react';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getManualImports, getSettings } from '@/app/actions';
import ImportsClient from './ImportsClient';
import Navigation from '../components/Navigation';
import Header from '../components/Header';

export const revalidate = 0; // Dynamic rendering

export default async function ImportsPage() {
  // Validate authentication session
  await getActiveGarageId();

  // Load configuration and existing historical records
  const initialImports = await getManualImports();
  const settings = await getSettings();
  const garageName = settings?.name || 'GarageBook';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ImportsNavigationWrapper initialImports={initialImports} garageName={garageName} />
    </div>
  );
}

// Separate client/server boundary helper component
function ImportsNavigationWrapper({ initialImports, garageName }: { initialImports: any[], garageName: string }) {
  return (
    <>
      <Navigation garageName={garageName} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={garageName} title="Imports" showBackButton={true} backDestination="/" />

        <main className="max-w-7xl w-full mx-auto px-4 py-4 md:py-8">
          <ImportsClient 
            initialImports={initialImports} 
            garageName={garageName} 
          />
        </main>
      </div>
    </>
  );
}
