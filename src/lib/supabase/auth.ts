import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

/**
 * Server-side helper to resolve the active tenant garage ID for the logged in owner.
 */
export async function getActiveGarageId(): Promise<string> {
  const isSupabase = db.isSupabase();
  if (!isSupabase) {
    return 'demo-garage-id';
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated.');
  }

  // Load garage settings
  const { data: garage } = (await supabase
    .from('garage')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()) as any;

  if (!garage) {
    // If database trigger hasn't completed yet, create default settings profile
    const { data: newGarage, error: createError } = (await supabase
      .from('garage')
      .insert({
        owner_id: user.id,
        name: 'My Motorcycle Garage',
        owner_name: user.email?.split('@')[0] || 'Owner Name',
        phone: '9876543210',
        address: 'Garage Address',
        footer_message: 'Thank you for your business! Ride safe!',
      } as any)
      .select('id')
      .single()) as any;

    if (createError || !newGarage) {
      console.error('Failed to create default garage in helper:', createError);
      throw new Error('Failed to resolve active garage ID.');
    }
    return newGarage.id;
  }

  return garage.id;
}
