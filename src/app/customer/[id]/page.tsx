import React from 'react';
import Navigation from '../../components/Navigation';
import Header from '../../components/Header';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getActiveGarageId } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { User, Phone, Bike, FileText, ArrowLeft, Plus, Edit2, Eye, Calendar, DollarSign } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailsPage({ params }: CustomerPageProps) {
  const resolvedParams = await params;
  const customerId = resolvedParams.id;
  
  // Resolve active tenant garage ID
  const garageId = await getActiveGarageId();

  // Create request-specific client for RLS authentication
  const supabase = await createClient();

  // Fetch Customer
  const customer = await db.getCustomerById(garageId, customerId, supabase);
  if (!customer) {
    notFound();
  }

  // Fetch Vehicles
  const vehicles = await db.getVehiclesByCustomerId(garageId, customerId, supabase);

  // Load Settings for Header
  const settings = await db.getGarageSettings(garageId, supabase);
  const garageName = settings?.name || 'GarageBook';

  // For each vehicle, fetch its bills
  const vehiclesWithBills = await Promise.all(
    vehicles.map(async (vehicle) => {
      const bills = await db.getBillsByVehicleId(garageId, vehicle.id, supabase);
      return {
        ...vehicle,
        bills,
      };
    })
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Navigation garageName={garageName} />

      {/* Main Content Pane */}
      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        
        {/* Header */}
        <Header garageName={garageName} showBackButton={true} backDestination="/search" />

        <main className="max-w-2xl w-full mx-auto px-4 py-8">
          
          {/* Navigation Link back */}
          <div className="mb-6">
            <Link 
              href="/search" 
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Search
            </Link>
          </div>

          {/* Customer Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{customer.name}</h1>
                  <div className="flex items-center gap-1 text-slate-500 font-semibold mt-1">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <a 
                  href={`https://wa.me/91${customer.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold gap-1.5"
                >
                  WhatsApp Chat
                </a>
              </div>
            </div>
          </div>

          {/* Vehicles Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Bike className="h-5 w-5 text-blue-600" /> Registered Vehicles ({vehicles.length})
              </h2>
              
              <Link
                href={`/entry/new?customerId=${customer.id}`}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Vehicle
              </Link>
            </div>

            {vehiclesWithBills.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <Bike className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-700">No vehicles registered yet</h3>
                <p className="text-slate-400 text-sm mt-1">Create a new entry to add a vehicle for this customer</p>
                <Link 
                  href={`/entry/new?customerId=${customer.id}`}
                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold mt-4 animate-none"
                >
                  Create Entry & Add Vehicle
                </Link>
              </div>
            ) : (
              vehiclesWithBills.map((vehicle, vIdx) => (
                <div key={vIdx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  
                  {/* Vehicle Card Header */}
                  <div className="bg-slate-50 border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600">
                        <Bike className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-lg">
                          {vehicle.brand} {vehicle.model}
                        </h3>
                        <span className="inline-block bg-white text-slate-900 font-mono font-bold text-xs tracking-wider border border-slate-300 rounded px-2.5 py-0.5 mt-0.5 shadow-sm">
                          {vehicle.vehicleNumber}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/entry/new?customerId=${customer.id}&vehicleId=${vehicle.id}`}
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm gap-1 self-start sm:self-center"
                    >
                      <Plus className="h-4 w-4" /> New Bill
                    </Link>
                  </div>

                  {/* Bills List */}
                  <div className="p-5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Invoices</h4>
                    
                    {vehicle.bills.length === 0 ? (
                      <p className="text-sm font-medium text-slate-400 italic py-2">No bills generated for this vehicle yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {vehicle.bills.map((bill, bIdx) => (
                          <div key={bIdx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>{bill.invoiceNumber}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>{new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-0.5 text-sm font-bold text-slate-800">
                                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                <span>₹{bill.total}</span>
                              </div>
                              
                              <span className={`inline-block font-extrabold text-xs px-2 py-0.5 rounded-full ${
                                bill.paymentStatus === 'PAID' 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {bill.paymentStatus}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/bill/${bill.id}`}
                                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </Link>
                              <Link
                                href={`/bill/${bill.id}/edit`}
                                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-1"
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Edit
                              </Link>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
