'use client';

import React, { useState, useMemo } from 'react';
import Navigation from '../components/Navigation';
import Header from '../components/Header';
import { Bill, GarageSettings, Payment, ManualImport } from '@/lib/db/types';
import { 
  Calendar, FileText, Download, Printer, TrendingUp, CheckCircle, Clock, AlertTriangle, Users, Wrench, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportsClientProps {
  bills: Bill[];
  settings: GarageSettings;
  imports: ManualImport[];
}

export default function ReportsClient({ bills, settings, imports }: ReportsClientProps) {
  const [filterMode, setFilterMode] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Drawer tally states (End of Day Tally Checklist)
  const [countedCash, setCountedCash] = useState<string>('');
  const [countedUpi, setCountedUpi] = useState<string>('');
  const [tallySaved, setTallySaved] = useState(false);

  // Date boundary check helper
  const matchesDate = (dateStr: string) => {
    const dVal = new Date(dateStr).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filterMode === 'TODAY') {
      return dVal >= todayStart;
    }
    if (filterMode === 'WEEK') {
      return dVal >= todayStart - 7 * 24 * 60 * 60 * 1000;
    }
    if (filterMode === 'MONTH') {
      return dVal >= todayStart - 30 * 24 * 60 * 60 * 1000;
    }
    if (filterMode === 'YEAR') {
      return new Date(dateStr).getFullYear() === now.getFullYear();
    }
    if (filterMode === 'CUSTOM' && startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // End of day
      return dVal >= s && dVal < e;
    }
    return true;
  };

  // Memoized report metrics calculation
  const reportMetrics = useMemo(() => {
    const filteredBills = bills.filter(b => matchesDate(b.date));
    const filteredImports = (imports || []).filter(m => matchesDate(m.billDate));

    const allPayments = bills.flatMap(b => {
      const pays = (b.payments || []).map(p => ({
        ...p,
        invoiceNumber: b.invoiceNumber,
        customerName: b.customer?.name,
      }));
      if (b.advances && b.advances.length > 0) {
        b.advances.forEach((adv, idx) => {
          const hasMatchingPay = b.payments?.some(p => p.notes === 'Advance' || p.notes === 'Advance payment');
          if (!hasMatchingPay) {
            pays.push({
              id: `adv_rep_${b.id}_${idx}`,
              billId: b.id,
              garageId: '',
              paymentMethod: adv.paymentMode,
              amount: adv.amount,
              paymentDate: b.date,
              notes: 'Advance',
              createdAt: b.date,
              invoiceNumber: b.invoiceNumber,
              customerName: b.customer?.name,
            });
          }
        });
      }
      return pays;
    });

    const filteredPayments = allPayments.filter(p => matchesDate(p.paymentDate));

    const billSales = filteredBills.reduce((sum, b) => sum + b.total, 0);
    const importSales = filteredImports.reduce((sum, m) => sum + m.amount, 0);
    const totalSales = billSales + importSales;

    const billOutstanding = filteredBills.reduce((sum, b) => sum + Math.max(0, Number(b.remainingAmount || 0)), 0);
    const importOutstanding = filteredImports.reduce((sum, m) => sum + Math.max(0, Number(m.pendingAmount || 0)), 0);
    const totalOutstanding = billOutstanding + importOutstanding;

    const paymentsCollections = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsWithNoteAdvance = filteredPayments
      .filter(p => p.notes === 'Advance' || p.notes === 'Advance payment')
      .reduce((sum, p) => sum + p.amount, 0);
    const advancesCollections = filteredBills.reduce((sum, b) => sum + (b.advanceReceived || 0), 0);
    const importCollections = filteredImports.reduce((sum, m) => sum + m.paidAmount, 0);
    const totalCollections = paymentsCollections - paymentsWithNoteAdvance + advancesCollections + importCollections;

    const billsCount = filteredBills.length + filteredImports.length;
    const uniqueCustomers = new Set([
      ...filteredBills.map(b => b.customerId),
      ...filteredImports.map(m => m.phone)
    ]).size;
    const uniqueVehicles = new Set([
      ...filteredBills.map(b => b.vehicleId),
      ...filteredImports.map(m => m.vehicleNumber)
    ]).size;

    const garagePartsRevenue = filteredBills.reduce((sum, b) => {
      const partsSum = b.items?.reduce((pSum, item) => pSum + (Number(item.finalPrice || item.price || 0)), 0) || 0;
      return sum + partsSum;
    }, 0);

    const garageLabourRevenue = filteredBills.reduce((sum, b) => {
      const labourSum = b.services?.filter(s => s.mechanicType === 'Salary' || !s.mechanicType)
        .reduce((lSum, s) => lSum + Number(s.finalCharge || 0), 0) || 0;
      return sum + labourSum;
    }, 0);

    const independentMechanicLabour = filteredBills.reduce((sum, b) => {
      const labourSum = b.services?.filter(s => s.mechanicType === 'Independent')
        .reduce((lSum, s) => lSum + Number(s.finalCharge || 0), 0) || 0;
      return sum + labourSum;
    }, 0);

    const totalGarageEarnings = garagePartsRevenue + garageLabourRevenue;
    const mechanicEarnings = independentMechanicLabour;

    return {
      filteredBills,
      filteredImports,
      filteredPayments,
      totalSales,
      totalOutstanding,
      totalCollections,
      billsCount,
      uniqueCustomers,
      uniqueVehicles,
      garagePartsRevenue,
      garageLabourRevenue,
      totalGarageEarnings,
      mechanicEarnings,
      independentMechanicLabour,
      importCollections
    };
  }, [bills, imports, filterMode, startDate, endDate]);

  const {
    filteredBills, filteredImports, filteredPayments,
    totalSales, totalOutstanding, totalCollections,
    billsCount, uniqueCustomers, uniqueVehicles,
    garagePartsRevenue, garageLabourRevenue,
    totalGarageEarnings, mechanicEarnings, independentMechanicLabour, importCollections
  } = reportMetrics;

  // Collections by Payment Method
  const paymentMethodsTotal = filteredPayments.reduce((acc, p) => {
    const m = p.paymentMethod;
    acc[m] = (acc[m] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  // Treat manual imports as Cash by default for drawer reconciliation
  paymentMethodsTotal['CASH'] = (paymentMethodsTotal['CASH'] || 0) + importCollections;

  const methodLabels: Record<string, string> = {
    CASH: '💵 Cash (Includes Imports)',
    UPI: '⚡ UPI / QR',
    CARD: '💳 Card Swipe',
    BANK_TRANSFER: '🏦 Bank Transfer',
    CREDIT: '🤝 Credit',
    OTHER: '⚙️ Other',
  };

  // Mechanic analysis
  const mechanicSummary = filteredBills.reduce((acc, b) => {
    const mechName = b.mechanic?.name || 'Owner / General';
    if (!acc[mechName]) {
      acc[mechName] = { name: mechName, count: 0, revenue: 0, labour: 0 };
    }
    acc[mechName].count += 1;
    acc[mechName].revenue += b.total;
    acc[mechName].labour += b.labour;
    return acc;
  }, {} as Record<string, { name: string; count: number; revenue: number; labour: number }>);

  const mechanicsList = Object.values(mechanicSummary).sort((a, b) => b.revenue - a.revenue);

  // GST Breakdown calculations
  const isGstEnabled = !!settings.gstNumber;
  const gstRate = 0.18;
  const baseTaxableAmount = totalSales / (1 + gstRate);
  const estimatedGstCollected = totalSales - baseTaxableAmount;
  const cgst9Percent = estimatedGstCollected / 2;
  const sgst9Percent = estimatedGstCollected / 2;

  // CSV Export helper
  const handleExportCSV = () => {
    try {
      const headers = ['Invoice No', 'Date', 'Customer Name', 'Phone', 'Vehicle No', 'Parts Total', 'Salary Labour Total', 'Independent Labour Total', 'Grand Total', 'Received Amount', 'Remaining Balance', 'Payment Status', 'Mechanic Name'];
      
      const standardRows = filteredBills.map(b => {
        const partsSum = b.items?.reduce((pSum, item) => pSum + (Number(item.finalPrice || item.price || 0)), 0) || 0;
        const salaryLabour = b.services?.filter(s => s.mechanicType === 'Salary' || !s.mechanicType).reduce((sum, s) => sum + Number(s.finalCharge || 0), 0) || 0;
        const independentLabour = b.services?.filter(s => s.mechanicType === 'Independent').reduce((sum, s) => sum + Number(s.finalCharge || 0), 0) || 0;
        return [
          b.invoiceNumber,
          new Date(b.date).toLocaleDateString('en-GB'),
          b.customer?.name || 'N/A',
          b.customer?.phone || 'N/A',
          b.vehicle?.vehicleNumber || 'N/A',
          partsSum,
          salaryLabour,
          independentLabour,
          b.total,
          b.receivedAmount,
          b.remainingAmount,
          b.paymentStatus,
          b.mechanic?.name || 'N/A',
        ];
      });

      const importRows = filteredImports.map(m => [
        `Imported (${m.id.substring(0, 5)})`,
        new Date(m.billDate).toLocaleDateString('en-GB'),
        m.customerName,
        m.phone,
        m.vehicleNumber,
        0,
        m.amount,
        m.amount,
        m.paidAmount,
        m.pendingAmount,
        m.pendingAmount > 0 ? 'PARTIAL' : 'PAID',
        'Imported Log',
      ]);

      const allRows = [...standardRows, ...importRows];

      const csvContent = 'data:text/csv;charset=utf-8,' 
        + [headers.join(','), ...allRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GarageBook_Sales_Report_${filterMode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Sales spreadsheet exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV file.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // System Cash and UPI collections
  const systemExpectedCash = paymentMethodsTotal['CASH'] || 0;
  const systemExpectedUpi = paymentMethodsTotal['UPI'] || 0;

  const cashVariance = (parseInt(countedCash) || 0) - systemExpectedCash;
  const upiVariance = (parseInt(countedUpi) || 0) - systemExpectedUpi;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={settings.name} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={settings.name} title="Reports & Analytics" showBackButton={true} backDestination="/" />

        <main className="max-w-2xl w-full mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
          
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CA & Accounting Reports</h1>
              <p className="text-slate-500 font-medium mt-1">Export transaction registries, tally cash drawers, and review taxes</p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Date range filters selector (no-print) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 no-print">
            <label className="text-sm font-bold text-slate-700 block">Report Period</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    filterMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {mode === 'WEEK' ? 'Week' : mode === 'MONTH' ? 'Month' : mode === 'YEAR' ? 'Year' : mode.charAt(0) + mode.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {filterMode === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PRINT-ONLY HEADER (Will only render on PDF/Print exports) */}
          <div className="hidden print-header flex justify-between items-end border-b border-slate-300 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">{settings.name} — Accounting Statement</h2>
              <p className="text-[10px] text-slate-500">{settings.address} | Phone: {settings.phone}</p>
              {settings.gstNumber && <p className="text-[10px] text-slate-800 font-bold">GSTIN: {settings.gstNumber}</p>}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Period: {filterMode} ({filterMode === 'CUSTOM' ? `${startDate} to ${endDate}` : new Date().toLocaleDateString('en-GB')})
              </span>
            </div>
          </div>

          {/* MAIN ACCOUNTING REPORT METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Booked Sales</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{totalSales}
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-1">Invoices + Imports registered</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Collections</span>
              <div className="text-2xl font-black text-success font-mono">
                ₹{totalCollections}
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-1">Actual deposits collected</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Outstanding Receivables</span>
              <div className="text-2xl font-black text-red-600 font-mono">
                ₹{totalOutstanding}
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-1">Unpaid customer ledger balances</p>
            </div>

          </div>

          {/* SALES DIVISION STATEMENTS CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-blue-600" /> Accounting Statements Breakdown
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>Garage Parts Revenue:</span>
                  <span className="font-mono text-slate-900 font-bold">₹{garagePartsRevenue}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Garage Labour (Salary staff):</span>
                  <span className="font-mono text-slate-900 font-bold">₹{garageLabourRevenue}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-100 pt-2">
                  <span>Net Garage Earnings:</span>
                  <span className="font-mono text-green-700">₹{totalGarageEarnings}</span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm font-semibold border-t sm:border-t-0 sm:border-l border-slate-150 pt-4 sm:pt-0 sm:pl-4">
                <div className="flex justify-between text-slate-600">
                  <span>Independent Mechanic Labour:</span>
                  <span className="font-mono text-slate-900 font-bold">₹{independentMechanicLabour}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-100 pt-2">
                  <span>Mechanic Earnings:</span>
                  <span className="font-mono text-amber-700">₹{mechanicEarnings}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OTHER METRICS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Total Bills</span>
              <span className="text-base font-extrabold text-slate-800">{billsCount} Invoices</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Customers Serviced</span>
              <span className="text-base font-extrabold text-slate-800">{uniqueCustomers} Accounts</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Vehicles Repaired</span>
              <span className="text-base font-extrabold text-slate-800">{uniqueVehicles} Motorcycles</span>
            </div>
          </div>

          {/* PAYMENT METHODS COLLECTIONS BREAKDOWN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-blue-600" /> Collections by Payment Mode
            </h3>

            <div className="space-y-3">
              {Object.keys(methodLabels).map((method) => {
                const total = paymentMethodsTotal[method] || 0;
                const percentage = totalCollections > 0 ? Math.round((total / totalCollections) * 100) : 0;
                
                return (
                  <div key={method} className="flex justify-between items-center text-sm font-semibold text-slate-800">
                    <span className="text-slate-600">{methodLabels[method]}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs font-semibold">{percentage}%</span>
                      <span className="font-mono font-bold text-slate-900 w-24 text-right">₹{total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ESTIMATED GST SUMMARY CARD (Show only if GSTIN exists) */}
          {isGstEnabled && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-blue-600" /> GST Tax Reconciliation
                </h3>
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  {settings.gstNumber}
                </span>
              </div>

              <div className="space-y-3.5 text-sm font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Sales (GST Inclusive 18%):</span>
                  <span className="font-mono font-bold text-slate-950">₹{totalSales}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base Value:</span>
                  <span className="font-mono font-bold text-slate-800">₹{Math.round(baseTaxableAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST Collected (9%):</span>
                  <span className="font-mono text-slate-800">₹{Math.round(cgst9Percent)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST Collected (9%):</span>
                  <span className="font-mono text-slate-800">₹{Math.round(sgst9Percent)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-100 pt-3">
                  <span>Total Tax Liability:</span>
                  <span className="font-mono text-blue-600">₹{Math.round(estimatedGstCollected)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STAFF MECHANICS LABOUR & REVENUE UTILIZATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
              <Wrench className="h-4.5 w-4.5 text-blue-600" /> Mechanic Service Allocation
            </h3>

            {mechanicsList.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold italic py-2">No service entries allocated in selected range.</p>
            ) : (
              <div className="space-y-4">
                {/* Desktop View */}
                <div className="hidden md:block space-y-2">
                  <div className="flex border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-400">
                    <div className="flex-1">STAFF NAME</div>
                    <div className="w-16 text-center">JOBS</div>
                    <div className="w-24 text-right">LABOUR VALUE</div>
                    <div className="w-24 text-right">TOTAL INVOICED</div>
                  </div>

                  {mechanicsList.map((mech, idx) => (
                    <div key={idx} className="flex text-sm font-semibold text-slate-800 items-center py-1">
                      <div className="flex-1 font-bold text-slate-900">{mech.name}</div>
                      <div className="w-16 text-center font-mono">{mech.count}</div>
                      <div className="w-24 text-right font-mono">₹{mech.labour}</div>
                      <div className="w-24 text-right font-mono font-bold text-slate-950">₹{mech.revenue}</div>
                    </div>
                  ))}
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-2.5">
                  {mechanicsList.map((mech, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-slate-900">{mech.name}</span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                          {mech.count} Jobs
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-150 font-bold text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">Labour Charged</span>
                          <span className="font-mono text-slate-800">₹{mech.labour}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">Total Invoiced</span>
                          <span className="font-mono text-slate-950">₹{mech.revenue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* END OF DAY (EOD) CLOSING ACCOUNT TALLY (no-print) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm no-print">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-success" /> End of Day Drawer Tally
            </h3>
            
            <p className="text-xs text-slate-400 font-bold italic mb-4">
              Enter physically counted cash and UPI statement balances below to compare against system register reports.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); setTallySaved(true); toast.success('Drawer tally checksheet locked!'); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Counted Cash Drawer (₹)</label>
                  <input
                    type="number"
                    value={countedCash}
                    onChange={(e) => { setCountedCash(e.target.value); setTallySaved(false); }}
                    placeholder="Enter physical cash"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                  {countedCash && (
                    <div className={`text-[10px] font-bold mt-1 ${cashVariance === 0 ? 'text-success' : 'text-red-600'}`}>
                      Expected: ₹{systemExpectedCash} | Variance:{' '}
                      {cashVariance >= 0 ? `+₹${cashVariance}` : `-₹${Math.abs(cashVariance)}`}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">UPI Ledger Totals (₹)</label>
                  <input
                    type="number"
                    value={countedUpi}
                    onChange={(e) => { setCountedUpi(e.target.value); setTallySaved(false); }}
                    placeholder="Enter statements total"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                  {countedUpi && (
                    <div className={`text-[10px] font-bold mt-1 ${upiVariance === 0 ? 'text-success' : 'text-red-600'}`}>
                      Expected: ₹{systemExpectedUpi} | Variance:{' '}
                      {upiVariance >= 0 ? `+₹${upiVariance}` : `-₹${Math.abs(upiVariance)}`}
                    </div>
                  )}
                </div>
              </div>

              {countedCash && countedUpi && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Total Variance Tally:</span>
                  <span className={`font-extrabold text-sm font-mono ${cashVariance + upiVariance === 0 ? 'text-success' : 'text-red-600'}`}>
                    {cashVariance + upiVariance >= 0 ? `+₹${cashVariance + upiVariance}` : `-₹${Math.abs(cashVariance + upiVariance)}`}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={tallySaved}
                className={`w-full py-2.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-sm ${
                  tallySaved ? 'bg-success' : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {tallySaved ? '✓ Tally Saved & Confirmed' : 'Confirm & Log Drawer Tally'}
              </button>
            </form>
          </div>

        </main>
      </div>
    </div>
  );
}
