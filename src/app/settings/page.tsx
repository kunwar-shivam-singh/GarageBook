'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import { 
  saveSettings, 
  getSettings, 
  getMechanics,
  createMechanic,
  deleteMechanic,
  updateMechanic,
  getPartSuggestions,
  getServiceSuggestions,
  addPartSuggestion,
  updatePartSuggestion,
  deletePartSuggestion,
  addServiceSuggestion,
  updateServiceSuggestion,
  deleteServiceSuggestion
} from '../actions';
import { createClient } from '@/lib/supabase/client';
import { GarageSettings, Mechanic, PartSuggestion, ServiceSuggestion } from '@/lib/db';
import { 
  User, FileText, Wrench, Package, Briefcase, CreditCard, 
  Calendar, Bell, Database, Shield, HelpCircle, Info, 
  Upload, RefreshCw, Save, Trash2, Plus, Edit2, Check, X, Search, ChevronRight, ToggleLeft, ToggleRight, LogOut
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handlePerformLogout = async () => {
    try {
      const isSupabase = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      if (isSupabase) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      
      // Clear local mode session
      document.cookie = "garage_owner_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Clear storage
      sessionStorage.clear();
      localStorage.clear();
      
      toast.success('Successfully logged out.');
      setShowLogoutConfirm(false);
      
      // Redirect using hard navigation to drop JS memories & routes history
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
      toast.error('Failed to log out.');
    }
  };

  // 12 Settings Sections State
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 1. Garage Profile State
  const [profileSettings, setProfileSettings] = useState<GarageSettings>({
    name: '',
    logo: '',
    ownerName: '',
    phone: '',
    address: '',
    footerMessage: '',
    gstNumber: '',
    warrantyNotes: '',
    whatsappNumber: '',
    socialMedia: '',
  });
  const [profileEmail, setProfileEmail] = useState('');

  // 2. Bill Settings State
  const [billSettings, setBillSettings] = useState({
    defaultLabourCharge: '',
    invoicePrefix: 'GB',
    nextInvoiceNumber: '1001',
    currency: '₹',
    showGarageLogo: true,
    showGst: true,
    showPhoneNumber: true,
    showAddress: true,
  });

  // 3. Mechanics State
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [newMechName, setNewMechName] = useState('');
  const [newMechType, setNewMechType] = useState<'Salary' | 'Independent'>('Salary');
  const [addingMech, setAddingMech] = useState(false);

  // 4. Parts Suggestions State
  const [partsList, setPartsList] = useState<PartSuggestion[]>([]);
  const [partsSearch, setPartsSearch] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingPartName, setEditingPartName] = useState('');
  const [editingPartPrice, setEditingPartPrice] = useState('');

  // 5. Service Suggestions State
  const [servicesList, setServicesList] = useState<ServiceSuggestion[]>([]);
  const [servicesSearch, setServicesSearch] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCharge, setNewServiceCharge] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');
  const [editingServiceCharge, setEditingServiceCharge] = useState('');

  // 6. Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    cashEnabled: true,
    upiEnabled: true,
    cardEnabled: true,
    bankTransferEnabled: true,
    otherEnabled: true,
    defaultPaymentMode: 'UPI',
    defaultFollowupDays: '7',
  });

  // 7. Business Settings State
  const [businessSettings, setBusinessSettings] = useState({
    openingTime: '09:00',
    closingTime: '21:00',
    workingDays: 'Mon, Tue, Wed, Thu, Fri, Sat',
    defaultWarrantyNote: '6-months warranty on spare parts replacements.',
  });

  // 8. Notifications State
  const [notificationsSettings, setNotificationsSettings] = useState({
    whatsappReminder: true,
    followupReminder: true,
    reminderBeforeDays: '1',
    reminderAfterDays: '2',
  });

  // 10. Security State
  const [securitySettings, setSecuritySettings] = useState({
    ownerPin: '',
    requirePinDiscount: false,
    requirePinDeleteBill: false,
    requirePinDeleteCustomer: false,
    requirePinEditOldBill: false,
  });

  // Help & Support Form
  const [supportMessage, setSupportMessage] = useState('');
  const [supportType, setSupportType] = useState('Feedback');
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);

  // Load configuration details on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load settings from db
        const data = await getSettings();
        if (data) {
          setProfileSettings({
            name: data.name || '',
            logo: data.logo || '',
            ownerName: data.ownerName || '',
            phone: data.phone || '',
            address: data.address || '',
            footerMessage: data.footerMessage || '',
            gstNumber: data.gstNumber || '',
            warrantyNotes: data.warrantyNotes || '',
            whatsappNumber: data.whatsappNumber || '',
            socialMedia: data.socialMedia || '',
          });
        }

        // Load mechanics
        const mechData = await getMechanics();
        if (mechData) setMechanics(mechData);

        // Load suggestions
        const parts = await getPartSuggestions('');
        if (parts) setPartsList(parts);
        const servs = await getServiceSuggestions('');
        if (servs) setServicesList(servs);

        // Load LocalStorage parameters
        if (typeof window !== 'undefined') {
          const localBill = localStorage.getItem('gb_bill_settings');
          if (localBill) setBillSettings(JSON.parse(localBill));

          const localPayment = localStorage.getItem('gb_payment_settings');
          if (localPayment) setPaymentSettings(JSON.parse(localPayment));

          const localBusiness = localStorage.getItem('gb_business_settings');
          if (localBusiness) setBusinessSettings(JSON.parse(localBusiness));

          const localNotif = localStorage.getItem('gb_notification_settings');
          if (localNotif) setNotificationsSettings(JSON.parse(localNotif));

          const localSec = localStorage.getItem('gb_security_settings');
          if (localSec) setSecuritySettings(JSON.parse(localSec));
        }

        // Auth info
        const isSupabase = !!(
          process.env.NEXT_PUBLIC_SUPABASE_URL && 
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        if (isSupabase) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setEmail(user.email);
            setProfileEmail(user.email);
          }
        } else {
          setEmail('Demo Mode (Local)');
          setProfileEmail('Demo Mode (Local)');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load Settings attributes');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Load section query param if any
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      if (sec) {
        setActiveSection(sec);
      }
    }
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Logo image size exceeds 1.5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileSettings(prev => ({
        ...prev,
        logo: reader.result as string
      }));
      toast.info('Logo image uploaded. Click Save to persist.');
    };
    reader.readAsDataURL(file);
  };

  // 1. Profile Saver
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(profileSettings);
      toast.success('Garage Profile updated successfully!');
      setActiveSection(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save Garage Profile.');
    } finally {
      setSaving(false);
    }
  };

  // 2. Bill Settings Saver
  const handleSaveBillSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gb_bill_settings', JSON.stringify(billSettings));
    toast.success('Bill layout preferences saved!');
    setActiveSection(null);
  };

  // 3. Mechanics Handlers
  const handleAddMech = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMechName.trim();
    if (!clean) return;
    setAddingMech(true);
    try {
      const mech = await createMechanic(clean, newMechType);
      setMechanics(prev => [...prev, mech].sort((a,b) => a.name.localeCompare(b.name)));
      setNewMechName('');
      toast.success(`${clean} registered successfully.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to register mechanic.');
    } finally {
      setAddingMech(false);
    }
  };

  const handleToggleMechStatus = async (mech: Mechanic) => {
    const nextType = mech.workType === 'Salary' ? 'Independent' : 'Salary';
    try {
      const updated = await updateMechanic(mech.id, mech.name, nextType);
      setMechanics(prev => prev.map(m => m.id === mech.id ? updated : m));
      toast.success(`Work type updated for ${mech.name}.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteMech = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from active staff list?`)) return;
    try {
      await deleteMechanic(id);
      setMechanics(prev => prev.filter(m => m.id !== id));
      toast.success(`${name} removed from roster.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete mechanic.');
    }
  };

  // 4. Parts Suggestions Handlers
  const handleAddPartSug = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPartName.trim();
    if (!name) return;
    const price = newPartPrice ? Number(newPartPrice) : null;
    try {
      const newItem = await addPartSuggestion(name, price);
      setPartsList(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
      setNewPartName('');
      setNewPartPrice('');
      toast.success('Part suggestion registered.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add part.');
    }
  };

  const handleSaveEditPart = async (id: string) => {
    if (!editingPartName.trim()) return;
    const price = editingPartPrice ? Number(editingPartPrice) : null;
    try {
      const updated = await updatePartSuggestion(id, editingPartName.trim(), price);
      setPartsList(prev => prev.map(p => p.id === id ? updated : p));
      setEditingPartId(null);
      toast.success('Part updated successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update part.');
    }
  };

  const handleDeletePartSug = async (id: string, name: string) => {
    if (!confirm(`Delete suggestion "${name}"?`)) return;
    try {
      await deletePartSuggestion(id);
      setPartsList(prev => prev.filter(p => p.id !== id));
      toast.success('Part suggestion deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete.');
    }
  };

  // 5. Service Suggestions Handlers
  const handleAddServiceSug = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newServiceName.trim();
    if (!name) return;
    const charge = newServiceCharge ? Number(newServiceCharge) : 0;
    try {
      const newItem = await addServiceSuggestion(name, charge);
      setServicesList(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
      setNewServiceName('');
      setNewServiceCharge('');
      toast.success('Service suggestion registered.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add service.');
    }
  };

  const handleSaveEditService = async (id: string) => {
    if (!editingServiceName.trim()) return;
    const charge = editingServiceCharge ? Number(editingServiceCharge) : 0;
    try {
      const updated = await updateServiceSuggestion(id, editingServiceName.trim(), charge);
      setServicesList(prev => prev.map(s => s.id === id ? updated : s));
      setEditingServiceId(null);
      toast.success('Service updated successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update service.');
    }
  };

  const handleDeleteServiceSug = async (id: string, name: string) => {
    if (!confirm(`Delete suggestion "${name}"?`)) return;
    try {
      await deleteServiceSuggestion(id);
      setServicesList(prev => prev.filter(s => s.id !== id));
      toast.success('Service suggestion deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete.');
    }
  };

  // 6. Payment Settings Saver
  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gb_payment_settings', JSON.stringify(paymentSettings));
    toast.success('Payment options settings saved.');
    setActiveSection(null);
  };

  // 7. Business Settings Saver
  const handleSaveBusinessSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gb_business_settings', JSON.stringify(businessSettings));
    toast.success('Business parameters saved.');
    setActiveSection(null);
  };

  // 8. Notifications Saver
  const handleSaveNotifSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gb_notification_settings', JSON.stringify(notificationsSettings));
    toast.success('Notification rules updated.');
    setActiveSection(null);
  };

  // 10. Security Saver
  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gb_security_settings', JSON.stringify(securitySettings));
    toast.success('Owner security rules updated.');
    setActiveSection(null);
  };

  // Help support submission mock handler
  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    toast.success(`Thank you! Your ${supportType} has been dispatched securely to Kunwar Shivam Singh.`);
    setSupportMessage('');
    setActiveSection(null);
  };

  // Export utility mock
  const triggerExport = (type: string, format: string) => {
    toast.loading(`Extracting ${type} register as ${format}...`, { id: 'export-toast' });
    setTimeout(() => {
      toast.success(`Export of ${type} in ${format} completed! File download initialized.`, { id: 'export-toast' });
    }, 1200);
  };

  // 12 settings sections definitions with title, description, and icon
  const menuItems = [
    { id: 'profile', title: 'Garage Profile', desc: 'Shop logo, name, phone, address, and GSTIN number details', icon: User, color: 'bg-blue-500' },
    { id: 'bill', title: 'Bill Settings', desc: 'Prefixes, next number, currency default values, and logo visibilities', icon: FileText, color: 'bg-green-500' },
    { id: 'mechanics', title: 'Mechanics', desc: 'Manage roster list, commissions, and staff active/inactive profiles', icon: Wrench, color: 'bg-indigo-500' },
    { id: 'parts', title: 'Parts Suggestions', desc: `Manage autocomplete database spares inventory (${partsList.length} items)`, icon: Package, color: 'bg-amber-500' },
    { id: 'services', title: 'Service Suggestions', desc: `Manage autocomplete labourops and standard rates (${servicesList.length} items)`, icon: Briefcase, color: 'bg-purple-500' },
    { id: 'payment', title: 'Payment Settings', desc: 'Payment modes activation switches, default followup dues days', icon: CreditCard, color: 'bg-teal-500' },
    { id: 'business', title: 'Business Settings', desc: 'Garage opening/closing operational timelines, default warranties', icon: Calendar, color: 'bg-pink-500' },
    { id: 'notifications', title: 'Notifications', desc: 'WhatsApp reminder schedules and clearance followup deadlines', icon: Bell, color: 'bg-rose-500' },
    { id: 'data', title: 'Data & Export', desc: 'Export customers list, bills ledger tables as CSV, Excel, or PDF backups', icon: Database, color: 'bg-cyan-500' },
    { id: 'security', title: 'Security', desc: 'Owner login PIN parameters, delete bill locks, and admin checks', icon: Shield, color: 'bg-red-500' },
    { id: 'help', title: 'Help & Support', desc: 'Troubleshoot registers, send feature reviews, or debug log errors', icon: HelpCircle, color: 'bg-orange-500' },
    { id: 'about', title: 'About GarageBook', desc: 'Current edition, developed by Kunwar Shivam Singh, terms and policies', icon: Info, color: 'bg-slate-500' },
  ];

  // Filtering settings items based on query
  const filteredMenuItems = menuItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-semibold flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" /> Loading Garage Settings...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={profileSettings.name || 'GarageBook'} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={profileSettings.name || 'GarageBook'} title="Settings" showBackButton={true} backDestination="/" />

        <main className="max-w-4xl w-full mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
          {/* Header Title */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
            <p className="text-slate-500 text-xs font-semibold mt-1">Logged in as: {email}</p>
          </div>

          {/* Android-Style Search Bar */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-3.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm shadow-sm font-semibold"
              placeholder="Search settings, mechanics, or suggestions..."
            />
          </div>

          {/* Settings Grid (Android inspired clean layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-150 flex items-center gap-4 focus:outline-none group active:scale-[0.98]"
                >
                  <div className={`h-11 w-11 rounded-xl ${item.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                    <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-350 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}

            {filteredMenuItems.length === 0 && (
              <div className="md:col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <Info className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No settings found</h3>
                <p className="text-slate-400 text-xs mt-1">Try matching names like &ldquo;Mechanics&rdquo;, &ldquo;GST&rdquo;, or &ldquo;Bill&rdquo;</p>
              </div>
            )}
          </div>

          {/* Logout Section at the bottom */}
          <div className="pt-6 flex justify-center border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full max-w-sm flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl py-4 text-sm font-extrabold shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
              Sign Out / Logout
            </button>
          </div>

          {/* OVERLAYS/MODALS FOR EACH SECTION */}
          {activeSection && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const matched = menuItems.find(m => m.id === activeSection);
                      if (!matched) return null;
                      const SectionIcon = matched.icon;
                      return (
                        <div className={`h-9 w-9 rounded-lg ${matched.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <SectionIcon className="h-4.5 w-4.5" />
                        </div>
                      );
                    })()}
                    <h2 className="text-lg font-black text-slate-900">
                      {menuItems.find(m => m.id === activeSection)?.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-5 text-sm">
                  
                  {/* 1. GARAGE PROFILE */}
                  {activeSection === 'profile' && (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Garage Logo</label>
                        <div className="flex items-center gap-4">
                          {profileSettings.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profileSettings.logo} alt="Logo" className="h-14 w-14 object-contain border border-slate-200 rounded-xl bg-slate-50" />
                          ) : (
                            <div className="h-14 w-14 border border-dashed border-slate-350 rounded-xl flex items-center justify-center bg-slate-50 text-[10px] font-bold text-slate-400">No Logo</div>
                          )}
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border border-slate-300 active:scale-95 transition-all">
                            <Upload className="h-3.5 w-3.5" /> Upload Image
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Garage Name</label>
                          <input type="text" required value={profileSettings.name} onChange={(e) => setProfileSettings({...profileSettings, name: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Owner Name</label>
                          <input type="text" required value={profileSettings.ownerName} onChange={(e) => setProfileSettings({...profileSettings, ownerName: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                          <input type="tel" required value={profileSettings.phone} onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">WhatsApp Number</label>
                          <input type="tel" value={profileSettings.whatsappNumber || ''} onChange={(e) => setProfileSettings({...profileSettings, whatsappNumber: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                          <input type="email" value={profileEmail} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 focus:outline-none font-semibold cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">GSTIN Number (optional)</label>
                          <input type="text" value={profileSettings.gstNumber || ''} onChange={(e) => setProfileSettings({...profileSettings, gstNumber: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none font-mono uppercase tracking-wider" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Garage Address</label>
                        <textarea value={profileSettings.address} onChange={(e) => setProfileSettings({...profileSettings, address: e.target.value})} required rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none resize-none" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Default Invoice Footer message</label>
                        <input type="text" required value={profileSettings.footerMessage} onChange={(e) => setProfileSettings({...profileSettings, footerMessage: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none" />
                      </div>

                      <button type="submit" disabled={saving} className="w-full bg-success hover:bg-success-hover text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform disabled:opacity-50">
                        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </form>
                  )}

                  {/* 2. BILL SETTINGS */}
                  {activeSection === 'bill' && (
                    <form onSubmit={handleSaveBillSettings} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Invoice Number Prefix</label>
                          <input type="text" value={billSettings.invoicePrefix} onChange={(e) => setBillSettings({...billSettings, invoicePrefix: e.target.value.toUpperCase()})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Next Sequence Start ID</label>
                          <input type="number" value={billSettings.nextInvoiceNumber} onChange={(e) => setBillSettings({...billSettings, nextInvoiceNumber: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-500 focus:outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Default Labour Charge (optional)</label>
                          <input type="number" value={billSettings.defaultLabourCharge} onChange={(e) => setBillSettings({...billSettings, defaultLabourCharge: e.target.value})} placeholder="e.g. 150" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Currency Symbol</label>
                          <input type="text" value={billSettings.currency} onChange={(e) => setBillSettings({...billSettings, currency: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none font-bold" />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Show On Receipt</span>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Display Garage Logo</span>
                          <button type="button" onClick={() => setBillSettings({...billSettings, showGarageLogo: !billSettings.showGarageLogo})}>
                            {billSettings.showGarageLogo ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Display GSTIN Registration</span>
                          <button type="button" onClick={() => setBillSettings({...billSettings, showGst: !billSettings.showGst})}>
                            {billSettings.showGst ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Display Phone Numbers</span>
                          <button type="button" onClick={() => setBillSettings({...billSettings, showPhoneNumber: !billSettings.showPhoneNumber})}>
                            {billSettings.showPhoneNumber ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Display Shop Address</span>
                          <button type="button" onClick={() => setBillSettings({...billSettings, showAddress: !billSettings.showAddress})}>
                            {billSettings.showAddress ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform">
                        <Save className="h-4 w-4" /> Save Bill Layout Settings
                      </button>
                    </form>
                  )}

                  {/* 3. MECHANICS */}
                  {activeSection === 'mechanics' && (
                    <div className="space-y-4">
                      <form onSubmit={handleAddMech} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-4">
                        <div className="sm:col-span-2">
                          <input type="text" required value={newMechName} onChange={(e) => setNewMechName(e.target.value)} placeholder="Mechanic Name (e.g. Raju)..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <select value={newMechType} onChange={(e: any) => setNewMechType(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold focus:outline-none cursor-pointer">
                            <option value="Salary">Salary Staff</option>
                            <option value="Independent">Independent</option>
                          </select>
                        </div>
                        <button type="submit" disabled={addingMech} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all">
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      </form>

                      <div className="max-h-[350px] overflow-y-auto space-y-2">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff ({mechanics.length})</span>
                        {mechanics.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 font-semibold italic text-xs">No staff registered.</div>
                        ) : (
                          mechanics.map((mech) => (
                            <div key={mech.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-200 shadow-sm">
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">{mech.name}</span>
                                <span className="text-[10px] font-bold text-slate-400">{mech.workType} Mechanic</span>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleToggleMechStatus(mech)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-extrabold border border-slate-300 active:scale-95 hover:bg-slate-300">
                                  Toggle Type
                                </button>
                                <button type="button" onClick={() => handleDeleteMech(mech.id, mech.name)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-150 hover:bg-red-100 active:scale-90">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. PARTS SUGGESTIONS */}
                  {activeSection === 'parts' && (
                    <div className="space-y-4">
                      {/* Add suggestion form */}
                      <form onSubmit={handleAddPartSug} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-4">
                        <div className="sm:col-span-2">
                          <input type="text" required value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="Spare Part (e.g. Spark Plug)..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-none" />
                        </div>
                        <div>
                          <input type="number" value={newPartPrice} onChange={(e) => setNewPartPrice(e.target.value)} placeholder="Price..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none" />
                        </div>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all">
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      </form>

                      {/* Search box suggestions list */}
                      <div>
                        <input type="text" value={partsSearch} onChange={(e) => setPartsSearch(e.target.value)} placeholder="Search spare parts database..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:outline-none mb-3 bg-slate-50" />
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {partsList.filter(p => p.name.toLowerCase().includes(partsSearch.toLowerCase())).map((part) => (
                            <div key={part.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-200">
                              {editingPartId === part.id ? (
                                <div className="flex flex-1 gap-2 mr-2">
                                  <input type="text" value={editingPartName} onChange={(e) => setEditingPartName(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                                  <input type="number" value={editingPartPrice} onChange={(e) => setEditingPartPrice(e.target.value)} placeholder="Price" className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs">{part.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400">Default Price: {part.price !== null ? `₹${part.price}` : 'N/A'}</span>
                                </div>
                              )}

                              <div className="flex gap-1.5 flex-shrink-0">
                                {editingPartId === part.id ? (
                                  <>
                                    <button onClick={() => handleSaveEditPart(part.id)} className="h-7 w-7 rounded bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"><Check className="h-4 w-4" /></button>
                                    <button onClick={() => setEditingPartId(null)} className="h-7 w-7 rounded bg-slate-200 text-slate-600 hover:bg-slate-350 flex items-center justify-center"><X className="h-4 w-4" /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditingPartId(part.id); setEditingPartName(part.name); setEditingPartPrice(part.price !== null ? String(part.price) : ''); }} className="h-7 w-7 rounded bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 flex items-center justify-center"><Edit2 className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDeletePartSug(part.id, part.name)} className="h-7 w-7 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. SERVICE SUGGESTIONS */}
                  {activeSection === 'services' && (
                    <div className="space-y-4">
                      {/* Add suggestion form */}
                      <form onSubmit={handleAddServiceSug} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-4">
                        <div className="sm:col-span-2">
                          <input type="text" required value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Service Operation (e.g. Engine Oil Flush)..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-none" />
                        </div>
                        <div>
                          <input type="number" required value={newServiceCharge} onChange={(e) => setNewServiceCharge(e.target.value)} placeholder="Charge..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none" />
                        </div>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all">
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      </form>

                      {/* Search box suggestions list */}
                      <div>
                        <input type="text" value={servicesSearch} onChange={(e) => setServicesSearch(e.target.value)} placeholder="Search service suggestions..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:outline-none mb-3 bg-slate-50" />
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {servicesList.filter(s => s.name.toLowerCase().includes(servicesSearch.toLowerCase())).map((sug) => (
                            <div key={sug.id} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-200">
                              {editingServiceId === sug.id ? (
                                <div className="flex flex-1 gap-2 mr-2">
                                  <input type="text" value={editingServiceName} onChange={(e) => setEditingServiceName(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                                  <input type="number" value={editingServiceCharge} onChange={(e) => setEditingServiceCharge(e.target.value)} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs">{sug.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400">Default Charge: ₹{sug.charge}</span>
                                </div>
                              )}

                              <div className="flex gap-1.5 flex-shrink-0">
                                {editingServiceId === sug.id ? (
                                  <>
                                    <button onClick={() => handleSaveEditService(sug.id)} className="h-7 w-7 rounded bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"><Check className="h-4 w-4" /></button>
                                    <button onClick={() => setEditingServiceId(null)} className="h-7 w-7 rounded bg-slate-200 text-slate-600 hover:bg-slate-350 flex items-center justify-center"><X className="h-4 w-4" /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditingServiceId(sug.id); setEditingServiceName(sug.name); setEditingServiceCharge(String(sug.charge)); }} className="h-7 w-7 rounded bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 flex items-center justify-center"><Edit2 className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDeleteServiceSug(sug.id, sug.name)} className="h-7 w-7 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. PAYMENT SETTINGS */}
                  {activeSection === 'payment' && (
                    <form onSubmit={handleSavePaymentSettings} className="space-y-4">
                      <div className="space-y-3 pb-3 border-b border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Enable Payment Modes</span>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Cash Mode</span>
                          <button type="button" onClick={() => setPaymentSettings({...paymentSettings, cashEnabled: !paymentSettings.cashEnabled})}>
                            {paymentSettings.cashEnabled ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">UPI / QR Code</span>
                          <button type="button" onClick={() => setPaymentSettings({...paymentSettings, upiEnabled: !paymentSettings.upiEnabled})}>
                            {paymentSettings.upiEnabled ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Card Payments</span>
                          <button type="button" onClick={() => setPaymentSettings({...paymentSettings, cardEnabled: !paymentSettings.cardEnabled})}>
                            {paymentSettings.cardEnabled ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Bank Transfer</span>
                          <button type="button" onClick={() => setPaymentSettings({...paymentSettings, bankTransferEnabled: !paymentSettings.bankTransferEnabled})}>
                            {paymentSettings.bankTransferEnabled ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Other (e.g. Credit)</span>
                          <button type="button" onClick={() => setPaymentSettings({...paymentSettings, otherEnabled: !paymentSettings.otherEnabled})}>
                            {paymentSettings.otherEnabled ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Default Payment Mode</label>
                          <select value={paymentSettings.defaultPaymentMode} onChange={(e) => setPaymentSettings({...paymentSettings, defaultPaymentMode: e.target.value})} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold focus:outline-none">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI / QR Code</option>
                            <option value="CARD">Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Default Follow-up Days</label>
                          <input type="number" value={paymentSettings.defaultFollowupDays} onChange={(e) => setPaymentSettings({...paymentSettings, defaultFollowupDays: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none font-bold" />
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform">
                        <Save className="h-4 w-4" /> Save Payment Settings
                      </button>
                    </form>
                  )}

                  {/* 7. BUSINESS SETTINGS */}
                  {activeSection === 'business' && (
                    <form onSubmit={handleSaveBusinessSettings} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Garage Opening Time</label>
                          <input type="time" value={businessSettings.openingTime} onChange={(e) => setBusinessSettings({...businessSettings, openingTime: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Garage Closing Time</label>
                          <input type="time" value={businessSettings.closingTime} onChange={(e) => setBusinessSettings({...businessSettings, closingTime: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Working Days</label>
                        <input type="text" value={businessSettings.workingDays} onChange={(e) => setBusinessSettings({...businessSettings, workingDays: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none font-bold" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Default Warranty Note</label>
                        <input type="text" value={businessSettings.defaultWarrantyNote} onChange={(e) => setBusinessSettings({...businessSettings, defaultWarrantyNote: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none" />
                      </div>

                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform">
                        <Save className="h-4 w-4" /> Save Business Settings
                      </button>
                    </form>
                  )}

                  {/* 8. NOTIFICATIONS */}
                  {activeSection === 'notifications' && (
                    <form onSubmit={handleSaveNotifSettings} className="space-y-4">
                      <div className="space-y-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-700 block">Enable WhatsApp Reminders</span>
                            <span className="text-[10px] text-slate-400 block font-bold">Autofill templates for chat sharing redirects</span>
                          </div>
                          <button type="button" onClick={() => setNotificationsSettings({...notificationsSettings, whatsappReminder: !notificationsSettings.whatsappReminder})}>
                            {notificationsSettings.whatsappReminder ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-700 block">Enable Follow-up Reminders</span>
                            <span className="text-[10px] text-slate-400 block font-bold">Populate dashboards followup cards</span>
                          </div>
                          <button type="button" onClick={() => setNotificationsSettings({...notificationsSettings, followupReminder: !notificationsSettings.followupReminder})}>
                            {notificationsSettings.followupReminder ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Reminder Before Due Date (Days)</label>
                          <input type="number" value={notificationsSettings.reminderBeforeDays} onChange={(e) => setNotificationsSettings({...notificationsSettings, reminderBeforeDays: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Reminder After Due Date (Days)</label>
                          <input type="number" value={notificationsSettings.reminderAfterDays} onChange={(e) => setNotificationsSettings({...notificationsSettings, reminderAfterDays: e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none" />
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform">
                        <Save className="h-4 w-4" /> Save Notification Rules
                      </button>
                    </form>
                  )}

                  {/* 9. DATA & EXPORT */}
                  {activeSection === 'data' && (
                    <div className="space-y-4">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Export Registers</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button onClick={() => triggerExport('Customers', 'Excel')} className="bg-slate-50 border border-slate-250 p-3 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs text-slate-700 active:scale-95">Customers (Excel)</button>
                        <button onClick={() => triggerExport('Invoices Ledger', 'CSV')} className="bg-slate-50 border border-slate-250 p-3 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs text-slate-700 active:scale-95">Bills Ledger (CSV)</button>
                        <button onClick={() => triggerExport('Collections', 'PDF')} className="bg-slate-50 border border-slate-250 p-3 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs text-slate-700 active:scale-95">Payments Log (PDF)</button>
                        <button onClick={() => triggerExport('Mechanics performance', 'Excel')} className="bg-slate-50 border border-slate-250 p-3 rounded-xl hover:bg-slate-100 transition-colors font-bold text-xs text-slate-700 active:scale-95">Staff Reports (Excel)</button>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Automated Cloud Backups</span>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center gap-3">
                          <Database className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-blue-800 text-xs block">Coming Soon (Founder Edition Bonus)</span>
                            <span className="text-[10px] text-blue-600 block mt-0.5">Continuous automated cloud database mirrors are being provisioned.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 10. SECURITY */}
                  {activeSection === 'security' && (
                    <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Owner Authentication PIN (optional)</label>
                        <input type="password" maxLength={6} placeholder="Enter numeric digits PIN..." value={securitySettings.ownerPin} onChange={(e) => setSecuritySettings({...securitySettings, ownerPin: e.target.value.replace(/[^0-9]/g, '')})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-500 focus:outline-none tracking-widest text-center" />
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Leave empty to bypass setting restrictions checks.</p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Require PIN Verification For</span>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Applying Large Discount (&gt;25%)</span>
                          <button type="button" onClick={() => setSecuritySettings({...securitySettings, requirePinDiscount: !securitySettings.requirePinDiscount})}>
                            {securitySettings.requirePinDiscount ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Deleting Service Invoices</span>
                          <button type="button" onClick={() => setSecuritySettings({...securitySettings, requirePinDeleteBill: !securitySettings.requirePinDeleteBill})}>
                            {securitySettings.requirePinDeleteBill ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Deleting Customer Contacts</span>
                          <button type="button" onClick={() => setSecuritySettings({...securitySettings, requirePinDeleteCustomer: !securitySettings.requirePinDeleteCustomer})}>
                            {securitySettings.requirePinDeleteCustomer ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Modifying Historical Bills</span>
                          <button type="button" onClick={() => setSecuritySettings({...securitySettings, requirePinEditOldBill: !securitySettings.requirePinEditOldBill})}>
                            {securitySettings.requirePinEditOldBill ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform">
                        <Save className="h-4 w-4" /> Save Security Rules
                      </button>
                    </form>
                  )}

                  {/* 11. HELP & SUPPORT */}
                  {activeSection === 'help' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <h4 className="font-bold text-slate-800 text-xs">User Guide Quick Links</h4>
                        <div className="flex flex-col text-xs text-blue-600 font-bold space-y-2">
                          <button
                            type="button"
                            onClick={() => setSelectedGuide(selectedGuide === 'intake' ? null : 'intake')}
                            className="hover:underline flex items-center gap-1 text-left cursor-pointer text-blue-600 font-bold"
                          >
                            → How to register a new vehicle intake?
                          </button>
                          {selectedGuide === 'intake' && (
                            <p className="text-slate-650 font-medium bg-white border border-slate-150 p-2.5 rounded-lg ml-2 animate-in fade-in slide-in-from-top-1 duration-150 leading-relaxed">
                              Go to the <strong>New Entry</strong> page from the menu drawer. Fill in customer phone & name. Enter bike details (brand, model, plate number). Select customer complaints, collect optional advance payment, and click <strong>Confirm & Save</strong> to place it directly in the active services queue.
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedGuide(selectedGuide === 'partial' ? null : 'partial')}
                            className="hover:underline flex items-center gap-1 text-left cursor-pointer text-blue-600 font-bold"
                          >
                            → Managing partial payments clearance
                          </button>
                          {selectedGuide === 'partial' && (
                            <p className="text-slate-650 font-medium bg-white border border-slate-150 p-2.5 rounded-lg ml-2 animate-in fade-in slide-in-from-top-1 duration-150 leading-relaxed">
                              Locate the job inside <strong>Bills History</strong> or <strong>Customer Profile</strong>. Tap the payment status indicator. In the popup modal clearance card, select the payment mode (UPI/Cash), enter the clearance amount, add optional notes, and click <strong>Record Payment</strong>.
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedGuide(selectedGuide === 'salary' ? null : 'salary')}
                            className="hover:underline flex items-center gap-1 text-left cursor-pointer text-blue-600 font-bold"
                          >
                            → Understanding mechanics salary calculations
                          </button>
                          {selectedGuide === 'salary' && (
                            <p className="text-slate-650 font-medium bg-white border border-slate-200 p-2.5 rounded-lg ml-2 animate-in fade-in slide-in-from-top-1 duration-150 leading-relaxed">
                              Assign a mechanic to the job card inside the <strong>Open Services Queue</strong>. Record completed service/labor tasks with designated mechanic commission rates. The <strong>Reports</strong> page collects and updates payouts automatically.
                            </p>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleSendSupport} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Issue Category</label>
                          <select value={supportType} onChange={(e) => setSupportType(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:outline-none">
                            <option value="Bug">Report a Bug / Error</option>
                            <option value="Feature">Request a New Feature</option>
                            <option value="Feedback">Send General Feedback</option>
                            <option value="Contact">Contact Developer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Message Description</label>
                          <textarea required value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} rows={3} placeholder="Please provide instructions/details for the developer..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none resize-none" />
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform">
                          Send Message
                        </button>
                      </form>
                    </div>
                  )}

                  {/* 12. ABOUT GARAGEBOOK */}
                  {activeSection === 'about' && (
                    <div className="space-y-4 text-center py-2">
                      <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-blue-100 mb-2">
                        <Info className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">GarageBook</h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Version 1.1.0 (Founder&apos;s Edition)</p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-4 text-xs font-semibold text-slate-600 space-y-1.5 text-left border border-slate-200">
                        <div className="flex justify-between"><span className="text-slate-400">Developed By:</span><span className="font-bold text-slate-800">Kunwar Shivam Singh</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Attribution Plan:</span><span className="font-bold text-slate-800">Lifetime Free Edition</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Release Date:</span><span className="font-bold text-slate-800">July 2026</span></div>
                      </div>

                      <p className="text-xs text-slate-400 font-medium pt-2">Thank you for using GarageBook! Ride safe, keep the logs clean, and streamline your mechanical workshop. For issues contact Kunwar Shivam Singh directly.</p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* DUPLICATE/LOGOUT CONFIRM OVERLAY */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
                <div className="flex items-start gap-2.5">
                  <div className="h-10 w-10 bg-red-50 text-red-650 rounded-xl flex items-center justify-center flex-shrink-0">
                    <LogOut className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Logout Confirmation</h3>
                    <p className="text-xs text-slate-500 mt-1">Are you sure you want to logout?</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowLogoutConfirm(false)} 
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handlePerformLogout} 
                    className="px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
