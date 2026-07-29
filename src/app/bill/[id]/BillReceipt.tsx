'use client';

import React, { useState } from 'react';
import Navigation from '../../components/Navigation';
import Header from '../../components/Header';
import Link from 'next/link';
import { Bill, GarageSettings, Payment } from '@/lib/db/types';
import { 
  Printer, Download, Share2, Edit2, Calendar, FileText, 
  ArrowLeft, CheckCircle, Clock, Plus, Trash2, Wallet, UserCheck, AlertTriangle, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { addPaymentToBill, deletePaymentFromBill } from '../../actions';

interface BillReceiptProps {
  bill: Bill;
  settings: GarageSettings;
}

export default function BillReceipt({ bill, settings }: BillReceiptProps) {
  const [downloading, setDownloading] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER'>('UPI');
  const [payAmount, setPayAmount] = useState<number>(bill.remainingAmount || 0);
  const [payNotes, setPayNotes] = useState('');
  
  // Check if any service was done by an Independent Mechanic
  const hasIndependentMechanic = bill.services?.some(s => s.mechanicType === 'Independent') || false;

  // Active view tab: 'combined' | 'parts' | 'labour' | 'audit'
  const [viewMode, setViewMode] = useState<'combined' | 'parts' | 'labour' | 'audit'>(
    hasIndependentMechanic ? 'parts' : 'combined'
  );

  const partsTotal = bill.partsTotal || bill.items?.reduce((sum, item) => sum + (Number(item.finalPrice || item.price || 0)), 0) || 0;
  const partsDiscount = bill.partsDiscount || 0;
  const servicesTotal = bill.labourTotal || Number(bill.labour) || 0;
  const servicesDiscount = bill.labourDiscount || 0;
  const grandTotal = bill.total;

  const handlePrint = () => {
    window.print();
  };

  const formatSeconds = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  const handleWhatsAppSend = () => {
    const vText = `${bill.vehicle?.brand} ${bill.vehicle?.model}`;
    const vNum = bill.vehicle?.vehicleNumber || '';
    const dateStr = new Date(bill.date).toLocaleDateString('en-GB');

    let messageText = '';

    if (viewMode === 'parts') {
      // Bill 1: Parts Only
      messageText = `Hi ${bill.customer?.name}, here is your Parts Invoice from ${settings.name}.

Invoice No: ${bill.invoiceNumber}
Date: ${dateStr}
Vehicle: ${vText} (${vNum})

Spare Parts:
${(bill.items || []).map(item => `• ${item.name} (x${item.quantity || 1}): ₹${item.finalPrice}`).join('\n')}

Parts Base Total: ₹${partsTotal}
Parts Discount: -₹${partsDiscount}
Total Parts Amount: ₹${partsTotal - partsDiscount}

Thank you for choosing ${settings.name}!`;
    } else if (viewMode === 'labour') {
      // Bill 2: Independent Labour Only
      const mechanicNames = Array.from(new Set((bill.services || []).map(s => s.mechanic?.name || 'Mechanic'))).join(', ');
      
      messageText = `Hi ${bill.customer?.name}, here is your Labour Invoice from Mechanic: ${mechanicNames}.

Reference Invoice No: ${bill.invoiceNumber}
Date: ${dateStr}
Vehicle: ${vText} (${vNum})

Services Performed:
${(bill.services || []).map(s => `• ${s.name} (by ${s.mechanic?.name || 'Staff'}): ₹${s.finalCharge}`).join('\n')}

Labour Base Total: ₹${servicesTotal}
Labour Discount: -₹${servicesDiscount}
Total Labour Charge: ₹${servicesTotal - servicesDiscount}

Completion Time: ${bill.jobEndTime ? new Date(bill.jobEndTime).toLocaleString('en-GB') : 'Completed'}
Working Duration: ${formatSeconds(bill.actualWorkingDuration || 0)}

Thank you!`;
    } else if (viewMode === 'audit') {
      // Internal Audit details
      messageText = `GarageBook Timer Audit Log: ${bill.invoiceNumber}
Vehicle: ${vText} (${vNum})
Queue Status: ${bill.jobStatus}
Working Duration: ${formatSeconds(bill.actualWorkingDuration || 0)}
Pause Duration: ${formatSeconds(bill.pauseDuration || 0)}
Staff logs:
${(bill.services || []).map(s => `• ${s.name}: Assigned to ${s.mechanic?.name || 'Staff'}`).join('\n')}`;
    } else {
      // Combined Bill
      messageText = `Hi ${bill.customer?.name}, here is your service bill from ${settings.name}.

Invoice No: ${bill.invoiceNumber}
Date: ${dateStr}
Vehicle: ${vText} (${vNum})

Spare Parts:
${(bill.items || []).map(item => `• ${item.name} (x${item.quantity || 1}): ₹${item.finalPrice}`).join('\n')}

Labour & Services:
${(bill.services || []).map(s => `• ${s.name}: ₹${s.finalCharge}`).join('\n')}`;

      if (bill.overallDiscount > 0) {
        messageText += `\nOverall Discount: -₹${bill.overallDiscount}`;
      }
      if (bill.previousDueAdded > 0) {
        messageText += `\nPrevious Dues Merged: +₹${bill.previousDueAdded}`;
      }

      messageText += `\nGrand Total: ₹${bill.total}
Status: ${bill.paymentStatus}`;

      if (bill.paymentStatus === 'PARTIAL') {
        messageText += `\nReceived: ₹${bill.receivedAmount}\nRemaining Balance: ₹${bill.remainingAmount}`;
      } else if (bill.paymentStatus === 'PENDING') {
        messageText += `\nOutstanding Balance: ₹${bill.total}`;
      }

      if (bill.showServiceNotes && bill.serviceNotes) {
        messageText += `\nService Notes: ${bill.serviceNotes}`;
      }

      messageText += `\n\nRemarks: ${bill.notes || 'N/A'}\n\n${settings.footerMessage}`;

      if (settings.warrantyNotes) {
        messageText += `\nWarranty: ${settings.warrantyNotes}`;
      }
      if (settings.whatsappNumber) {
        messageText += `\nWhatsApp: ${settings.whatsappNumber}`;
      }
      if (settings.socialMedia) {
        messageText += `\nSocial: ${settings.socialMedia}`;
      }
      messageText += `\n\nVisit Again!`;
    }

    const cleanPhone = bill.customer?.phone.replace(/[^0-9]/g, '') || '';
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('WhatsApp redirect opened!');
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }
    if (payAmount > bill.remainingAmount) {
      toast.error('Payment amount cannot exceed the remaining outstanding balance.');
      return;
    }
    setAddingPayment(true);
    try {
      await addPaymentToBill(bill.id, payMethod, payAmount, payNotes.trim());
      toast.success('Payment recorded successfully!');
      setPayNotes('');
      const nextRemaining = Math.max(0, bill.remainingAmount - payAmount);
      setPayAmount(nextRemaining);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add payment.');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (payId: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deletePaymentFromBill(payId, bill.id);
      toast.success('Payment deleted successfully.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete payment.');
    }
  };

  const handleDownloadPDF = () => {
    setDownloading(true);
    toast.loading('Generating invoice PDF...', { id: 'pdf-toast' });
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const primaryColor = '#1e3a8a';
      const textColor = '#1e293b';
      const lightBg = '#f8fafc';
      const borderLine = '#cbd5e1';

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let y = 15;

      // Header
      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      
      let headerName = settings.name;
      if (viewMode === 'labour') {
        const mechanicNames = Array.from(new Set((bill.services || []).map(s => s.mechanic?.name || 'Mechanic'))).join(', ');
        headerName = `${mechanicNames} (Labour Bill)`;
      }
      doc.text(headerName, margin, y);
      y += 6;

      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      
      const splitAddress = doc.splitTextToSize(settings.address, pageWidth - margin * 2);
      splitAddress.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 3.5;
      });

      doc.text(`Phone: ${settings.phone} | Owner: ${settings.ownerName}`, margin, y);
      y += 4;

      if (settings.gstNumber && viewMode !== 'labour') {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${settings.gstNumber}`, margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
      }

      doc.setDrawColor(borderLine);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      // Invoice info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      
      let titleLabel = 'TAX INVOICE';
      if (viewMode === 'parts') titleLabel = `PARTS INVOICE: ${bill.invoiceNumber}`;
      else if (viewMode === 'labour') titleLabel = `MECHANIC LABOUR LOG: ${bill.invoiceNumber}`;
      else if (viewMode === 'audit') titleLabel = `TIMER AUDIT DETAILS: ${bill.invoiceNumber}`;
      else titleLabel = `TAX INVOICE: ${bill.invoiceNumber}`;

      doc.text(titleLabel, margin, y);
      
      const dateStr = new Date(bill.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${dateStr}`, pageWidth - margin - 35, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.text(`Status: ${bill.paymentStatus}`, margin, y);
      y += 5;

      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      // Customer / Bike Spec
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER DETAILS', margin, y);
      doc.text('VEHICLE DETAILS', pageWidth / 2 + 5, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${bill.customer?.name}`, margin, y);
      doc.text(`Model: ${bill.vehicle?.brand} ${bill.vehicle?.model}`, pageWidth / 2 + 5, y);
      y += 4;

      doc.text(`Phone: ${bill.customer?.phone}`, margin, y);
      doc.text(`Reg No: ${bill.vehicle?.vehicleNumber}`, pageWidth / 2 + 5, y);
      y += 5;

      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      if (viewMode === 'combined' || viewMode === 'parts') {
        // --- PARTS RENDER ---
        if (bill.items && bill.items.length > 0) {
          doc.setFillColor(lightBg);
          doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
          doc.setFont('helvetica', 'bold');
          doc.text('Part Description (Qty)', margin + 2, y + 4);
          doc.text('Total Price (INR)', pageWidth - margin - 25, y + 4);
          y += 9;

          doc.setFont('helvetica', 'normal');
          (bill.items || []).forEach((item) => {
            doc.text(`${item.name} (x${item.quantity || 1})`, margin + 2, y);
            doc.text(`Rs. ${item.finalPrice || Number(item.price) || 0}`, pageWidth - margin - 25, y);
            y += 4.5;
          });
        }
      }

      if (viewMode === 'combined' || viewMode === 'labour') {
        // --- SERVICES LABOUR RENDER ---
        if (bill.services && bill.services.length > 0) {
          y += 2;
          doc.setFillColor(lightBg);
          doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
          doc.setFont('helvetica', 'bold');
          doc.text('Labour Service Task', margin + 2, y + 4);
          doc.text('Charge (INR)', pageWidth - margin - 25, y + 4);
          y += 9;

          doc.setFont('helvetica', 'normal');
          (bill.services || []).forEach((s) => {
            doc.text(`${s.name} ${s.mechanic ? `(${s.mechanic.name})` : ''}`, margin + 2, y);
            doc.text(`Rs. ${s.finalCharge}`, pageWidth - margin - 25, y);
            y += 4.5;
          });
        }
      }

      if (viewMode === 'audit') {
        // --- AUDIT TIMER LOG RENDER ---
        doc.setFillColor(lightBg);
        doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Service Task', margin + 2, y + 4);
        doc.text('Assigned Staff', pageWidth / 2 + 5, y + 4);
        doc.text('Charge (INR)', pageWidth - margin - 20, y + 4);
        y += 9;

        doc.setFont('helvetica', 'normal');
        (bill.services || []).forEach((s) => {
          doc.text(s.name, margin + 2, y);
          doc.text(s.mechanic?.name || 'Unassigned', pageWidth / 2 + 5, y);
          doc.text(`Rs. ${s.finalCharge}`, pageWidth - margin - 20, y);
          y += 5;
        });

        y += 3;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('WORKSHOP SERVICE TIMER LOG', margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.text(`Workshop Status Queue: ${bill.jobStatus}`, margin, y);
        y += 4.5;

        if (bill.jobStartTime) {
          doc.text(`Job Working Started: ${new Date(bill.jobStartTime).toLocaleString('en-GB')}`, margin, y);
          y += 4.5;
        }
        if (bill.jobEndTime) {
          doc.text(`Job Work Completed: ${new Date(bill.jobEndTime).toLocaleString('en-GB')}`, margin, y);
          y += 4.5;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`Actual Working duration: ${formatSeconds(bill.actualWorkingDuration || 0)}`, margin, y);
        y += 4.5;
        doc.text(`Parts delay Pause duration: ${formatSeconds(bill.pauseDuration || 0)}`, margin, y);
        y += 4.5;
        doc.text(`Total Workshop duration: ${formatSeconds(bill.totalWorkingTime || 0)}`, margin, y);
        y += 6;
      }

      if (viewMode !== 'audit') {
        y += 3;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        if (viewMode === 'parts') {
          doc.text('Spare Parts Total:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${partsTotal}`, pageWidth - margin - 20, y);
          y += 4.5;
          doc.text('Parts Discount:', pageWidth - margin - 60, y);
          doc.text(`-Rs. ${partsDiscount}`, pageWidth - margin - 20, y);
          y += 4.5;
          doc.setFont('helvetica', 'bold');
          doc.text('Parts Payable Total:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${partsTotal - partsDiscount}`, pageWidth - margin - 20, y);
          y += 5;
        } else if (viewMode === 'labour') {
          doc.text('Labour Services Total:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${servicesTotal}`, pageWidth - margin - 20, y);
          y += 4.5;
          doc.text('Labour Discount:', pageWidth - margin - 60, y);
          doc.text(`-Rs. ${servicesDiscount}`, pageWidth - margin - 20, y);
          y += 4.5;
          doc.setFont('helvetica', 'bold');
          doc.text('Labour Payable Total:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${servicesTotal - servicesDiscount}`, pageWidth - margin - 20, y);
          y += 5;
        } else {
          // Combined totals
          doc.text('Parts Total (gross):', pageWidth - margin - 60, y);
          doc.text(`Rs. ${partsTotal}`, pageWidth - margin - 20, y);
          y += 4.5;

          doc.text('Item Discounts (parts):', pageWidth - margin - 60, y);
          doc.text(`-Rs. ${partsDiscount}`, pageWidth - margin - 20, y);
          y += 4.5;

          doc.text('Labour Total (gross):', pageWidth - margin - 60, y);
          doc.text(`Rs. ${servicesTotal}`, pageWidth - margin - 20, y);
          y += 4.5;

          doc.text('Labour Discount:', pageWidth - margin - 60, y);
          doc.text(`-Rs. ${servicesDiscount}`, pageWidth - margin - 20, y);
          y += 4.5;

          if (bill.overallDiscount > 0) {
            doc.text('Overall Discount:', pageWidth - margin - 60, y);
            doc.text(`-Rs. ${bill.overallDiscount}`, pageWidth - margin - 20, y);
            y += 4.5;
          }

          if (bill.previousDueAdded > 0) {
            doc.text('Previous Outstanding Dues:', pageWidth - margin - 60, y);
            doc.text(`+Rs. ${bill.previousDueAdded}`, pageWidth - margin - 20, y);
            y += 4.5;
          }

          doc.setFont('helvetica', 'bold');
          doc.text('Final Amount:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${grandTotal}`, pageWidth - margin - 20, y);
          y += 5;

          doc.setFont('helvetica', 'normal');
          doc.text('Advance Received:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${bill.advanceReceived || 0}`, pageWidth - margin - 20, y);
          y += 4.5;

          const advMode = bill.advances?.[0]?.paymentMode || bill.payments?.find(p => p.notes === 'Advance' || p.notes === 'Advance payment')?.paymentMethod || 'N/A';
          doc.text('Advance Payment Mode:', pageWidth - margin - 60, y);
          doc.text(`${advMode}`, pageWidth - margin - 20, y);
          y += 4.5;

          doc.setFont('helvetica', 'bold');
          doc.text('Remaining Amount:', pageWidth - margin - 60, y);
          doc.text(`Rs. ${bill.remainingAmount}`, pageWidth - margin - 20, y);
          y += 5;

          if (bill.remainingAmount > 0 && bill.expectedPaymentDate) {
            doc.setFont('helvetica', 'italic');
            const expectedDateText = new Date(bill.expectedPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            doc.text(`Expected Payment Date: ${expectedDateText}`, margin, y);
            y += 5;
          }
        }
      }

      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      if (bill.notes && viewMode !== 'labour') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text(`Remarks: ${bill.notes}`, margin, y);
        y += 5;
      }

      if (bill.showServiceNotes && bill.serviceNotes && viewMode !== 'labour') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text(`Service Notes: ${bill.serviceNotes}`, margin, y);
        y += 5;
      }

      if (settings.warrantyNotes && viewMode !== 'labour') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Warranty: ${settings.warrantyNotes}`, margin, y);
        y += 5;
      }

      if (viewMode !== 'labour' && (settings.whatsappNumber || settings.socialMedia)) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        let contactLine = '';
        if (settings.whatsappNumber) contactLine += `WhatsApp: ${settings.whatsappNumber}  `;
        if (settings.socialMedia) contactLine += `Social: ${settings.socialMedia}`;
        doc.text(contactLine, margin, y);
        y += 5;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const footerMsg = settings.footerMessage;
      const centeredX = (pageWidth - doc.getTextWidth(footerMsg)) / 2;
      doc.text(footerMsg, centeredX, y);
      y += 5;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const visitAgainMsg = "Visit Again!";
      const centeredX2 = (pageWidth - doc.getTextWidth(visitAgainMsg)) / 2;
      doc.text(visitAgainMsg, centeredX2, y);

      doc.save(`${bill.invoiceNumber}_${viewMode}.pdf`);
      toast.success('PDF download completed!', { id: 'pdf-toast' });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF.', { id: 'pdf-toast' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation garageName={settings.name} />

      <div className="flex-1 md:pl-64 min-h-screen flex flex-col pb-20 md:pb-0">
        <Header garageName={settings.name} showBackButton={true} backDestination={`/customer/${bill.customerId}`} />

        <main className="max-w-2xl w-full mx-auto px-4 py-8">
          
          {/* Back Nav links */}
          <div className="mb-6 flex items-center justify-between no-print">
            <Link 
              href={`/customer/${bill.customerId}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Customer
            </Link>
            
            <Link 
              href={`/bill/${bill.id}/edit`}
              className="inline-flex items-center gap-1 text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 font-bold px-3.5 py-2 rounded-xl text-sm"
            >
              <Edit2 className="h-4 w-4" /> Edit Bill
            </Link>
          </div>

          {/* MODE TOGGLE SWITCHES (NO PRINT) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm mb-6 flex flex-wrap gap-2 justify-center no-print">
            <button
              onClick={() => setViewMode('combined')}
              className={`flex-1 min-w-[120px] py-2 text-xs font-extrabold rounded-xl transition-all border ${
                viewMode === 'combined'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Combined Invoice Layout
            </button>
            
            {hasIndependentMechanic && (
              <>
                <button
                  onClick={() => setViewMode('parts')}
                  className={`flex-1 min-w-[120px] py-2 text-xs font-extrabold rounded-xl transition-all border ${
                    viewMode === 'parts'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bill 1: Parts Invoice
                </button>
                
                <button
                  onClick={() => setViewMode('labour')}
                  className={`flex-1 min-w-[120px] py-2 text-xs font-extrabold rounded-xl transition-all border ${
                    viewMode === 'labour'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bill 2: Labour Invoice
                </button>
              </>
            )}

            <button
              onClick={() => setViewMode('audit')}
              className={`flex-1 min-w-[120px] py-2 text-xs font-extrabold rounded-xl transition-all border ${
                viewMode === 'audit'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Mechanic Timers Audit
            </button>
          </div>

          {/* ACTIONS BAR (NO PRINT) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 grid grid-cols-3 gap-3 no-print">
            <button
              onClick={handlePrint}
              className="flex flex-col items-center justify-center py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold gap-1"
            >
              <Printer className="h-5 w-5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex flex-col items-center justify-center py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-800 rounded-xl text-sm font-bold gap-1"
            >
              <Download className="h-5 w-5" />
              <span>{downloading ? 'PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleWhatsAppSend}
              className="flex flex-col items-center justify-center py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold gap-1"
            >
              <Share2 className="h-5 w-5" />
              <span>Send WhatsApp</span>
            </button>
          </div>

          {/* QUICK "ADD PAYMENT" WORKFLOW (NO PRINT) */}
          {bill.remainingAmount > 0 && viewMode === 'combined' && (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm mb-6 no-print">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-800">Outstanding Balance: ₹{bill.remainingAmount}</h3>
              </div>
              
              <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <select
                    value={payMethod}
                    onChange={(e: any) => setPayMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card Swipe</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT">Credit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div>
                  <input
                    type="number"
                    required
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(parseInt(e.target.value) || 0)}
                    placeholder="Amount (₹)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono font-bold text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={addingPayment}
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 py-2.5 transition-colors disabled:opacity-50 font-bold"
                >
                  <Plus className="h-4 w-4" /> {addingPayment ? 'Adding...' : 'Mark Received'}
                </button>
              </form>
            </div>
          )}

          {/* INVOICE CONTAINER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print-container text-left">
            
            {/* Logo and business name header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
              <div>
                {settings.logo && viewMode !== 'labour' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo} alt="Logo" className="max-h-16 max-w-[180px] object-contain mb-3" />
                )}
                
                {viewMode === 'labour' ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-widest mb-1">Labour Invoice</span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                      {Array.from(new Set((bill.services || []).map(s => s.mechanic?.name || 'Mechanic'))).join(', ')}
                    </h2>
                  </div>
                ) : (
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
                    {settings.name}
                  </h2>
                )}
                
                <p className="text-xs text-slate-500 font-semibold max-w-sm whitespace-pre-line leading-relaxed">
                  {settings.address}
                </p>
                <p className="text-xs text-slate-700 font-bold mt-1">
                  Phone: {settings.phone}
                </p>
                {settings.gstNumber && viewMode !== 'labour' && (
                  <p className="text-xs text-slate-800 font-bold mt-1">
                    GSTIN: <span className="font-mono tracking-wider">{settings.gstNumber}</span>
                  </p>
                )}
              </div>
              
              <div className="sm:text-right flex flex-col items-start sm:items-end gap-1.5 flex-shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {viewMode === 'combined' ? 'Tax Invoice' : (viewMode === 'parts' ? 'Parts Invoice (Bill 1)' : (viewMode === 'labour' ? 'Labour Invoice (Bill 2)' : 'Timer Audit log'))}
                </span>
                <div className="text-xl font-black text-slate-800 leading-none">{bill.invoiceNumber}</div>
                
                <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold mt-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-1">
                  {bill.paymentStatus === 'PAID' ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" /> PAID
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 border text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      bill.paymentStatus === 'PARTIAL' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <Clock className="h-3 w-3" /> {bill.paymentStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Vehicle info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-100 text-sm">
              <div className="space-y-1 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
                <div className="font-extrabold text-slate-900">{bill.customer?.name}</div>
                <div className="text-slate-500 font-semibold text-xs mt-0.5">Phone: {bill.customer?.phone}</div>
              </div>

              <div className="space-y-1 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Details</span>
                <div className="font-extrabold text-slate-900">{bill.vehicle?.brand} {bill.vehicle?.model}</div>
                <div className="flex items-center gap-1 text-xs mt-0.5">
                  <span className="text-slate-400 font-semibold">Reg Number:</span>
                  <span className="bg-white font-mono font-bold border border-slate-200 px-1.5 py-0.2 rounded text-slate-800">
                    {bill.vehicle?.vehicleNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* CONDITIONAL BODY RENDER */}
            {viewMode === 'combined' || viewMode === 'parts' ? (
              <>
                {/* Parts details */}
                {bill.items && bill.items.length > 0 && (
                  <div className="py-5 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Spare Parts Details</h3>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                        <span>Part Description (Qty)</span>
                        <span>Amount (₹)</span>
                      </div>

                      {bill.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm font-semibold text-slate-800">
                          <div className="flex items-baseline gap-1.5">
                            <span>{item.name}</span>
                            <span className="text-xs text-slate-400 font-bold">x{item.quantity || 1}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">₹{item.finalPrice || Number(item.price) || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {viewMode === 'combined' || viewMode === 'labour' ? (
              <>
                {/* Labour details */}
                {bill.services && bill.services.length > 0 && (
                  <div className="py-5 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Labor & Service Operations</h3>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                        <span>Service Operation (Assigned Staff)</span>
                        <span>Charge (₹)</span>
                      </div>

                      {bill.services.map((s, idx) => (
                        <div key={idx} className="flex justify-between text-sm font-semibold text-slate-800">
                          <div>
                            <span>{s.name}</span>
                            {s.mechanic && (
                              <span className="text-xs text-blue-600 font-extrabold ml-1.5 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-lg">
                                {s.mechanic.name} ({s.mechanicType})
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-900">₹{s.finalCharge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {viewMode === 'audit' && (
              <>
                {/* TIMERS AUDIT DETAILS */}
                <div className="py-5 border-b border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Labor Operations Log</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                      <span>Task Operation</span>
                      <span>Assigned Staff</span>
                      <span>Labor Charge</span>
                    </div>

                    {(bill.services || []).map((s, idx) => (
                      <div key={idx} className="flex justify-between text-sm font-semibold text-slate-800">
                        <span>{s.name}</span>
                        <span className="font-bold text-slate-700">{s.mechanic?.name || 'Unassigned (Owner)'}</span>
                        <span className="font-mono font-bold text-slate-900">₹{s.finalCharge}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-5 border-b border-slate-100 space-y-3.5 text-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Service Timer Audit Logs</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600 font-bold text-xs">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block uppercase">Timestamps</span>
                      <div>Queue Status: <span className="font-extrabold text-slate-800">{bill.jobStatus}</span></div>
                      {bill.jobStartTime && (
                        <div>Started: <span className="font-extrabold text-slate-800">{new Date(bill.jobStartTime).toLocaleString('en-GB')}</span></div>
                      )}
                      {bill.jobEndTime && (
                        <div>Completed: <span className="font-extrabold text-slate-800">{new Date(bill.jobEndTime).toLocaleString('en-GB')}</span></div>
                      )}
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block uppercase">Duration Audit</span>
                      <div>Actual Working: <span className="font-mono text-green-700 font-extrabold">{formatSeconds(bill.actualWorkingDuration || 0)}</span></div>
                      <div>Parts delay Pause: <span className="font-mono text-purple-700 font-extrabold">{formatSeconds(bill.pauseDuration || 0)}</span></div>
                      <div>Total Workshop time: <span className="font-mono text-slate-800 font-black">{formatSeconds(bill.totalWorkingTime || 0)}</span></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Invoices Totals logic based on active layout */}
            {viewMode !== 'audit' && (
              <div className="py-5 flex flex-col items-end gap-2 text-sm border-b border-slate-100">
                {viewMode === 'parts' ? (
                  <>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold">
                      <span>Parts Base Total:</span>
                      <span className="font-mono font-bold text-slate-800">₹{partsTotal}</span>
                    </div>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold pb-2 border-b border-dashed border-slate-100">
                      <span>Parts Discount:</span>
                      <span className="font-mono font-bold text-slate-800">-₹{partsDiscount}</span>
                    </div>
                    <div className="flex justify-between w-64 text-slate-900 font-black text-base pt-1">
                      <span>Total Parts Due:</span>
                      <span className="font-mono text-blue-600">₹{partsTotal - partsDiscount}</span>
                    </div>
                  </>
                ) : viewMode === 'labour' ? (
                  <>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold">
                      <span>Labour Base Total:</span>
                      <span className="font-mono font-bold text-slate-800">₹{servicesTotal}</span>
                    </div>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold pb-2 border-b border-dashed border-slate-100">
                      <span>Labour Discount:</span>
                      <span className="font-mono font-bold text-slate-800">-₹{servicesDiscount}</span>
                    </div>
                    
                    {bill.jobEndTime && (
                      <div className="flex justify-between w-64 text-slate-500 font-semibold text-xs py-1">
                        <span>Actual Repairing Duration:</span>
                        <span>{formatSeconds(bill.actualWorkingDuration || 0)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between w-64 text-slate-900 font-black text-base pt-1">
                      <span>Total Labour Due:</span>
                      <span className="font-mono text-blue-600">₹{servicesTotal - servicesDiscount}</span>
                    </div>
                  </>
                ) : (
                  // Combined Totals Details
                  <>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold">
                      <span>Parts Total (gross):</span>
                      <span className="font-mono font-bold text-slate-800">₹{partsTotal}</span>
                    </div>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold">
                      <span>Item Discounts (parts):</span>
                      <span className="font-mono font-bold text-slate-800">-₹{partsDiscount}</span>
                    </div>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold mt-1">
                      <span>Labour Total (gross):</span>
                      <span className="font-mono font-bold text-slate-800">₹{servicesTotal}</span>
                    </div>
                    <div className="flex justify-between w-64 text-slate-500 font-semibold">
                      <span>Labour Discount:</span>
                      <span className="font-mono font-bold text-slate-800">-₹{servicesDiscount}</span>
                    </div>
                    
                    {bill.overallDiscount > 0 && (
                      <div className="flex justify-between w-64 text-red-600 font-bold">
                        <span>Overall Discount Applied:</span>
                        <span className="font-mono">-₹{bill.overallDiscount}</span>
                      </div>
                    )}

                    {bill.previousDueAdded > 0 && (
                      <div className="flex justify-between w-64 text-slate-600 font-bold">
                        <span>Previous Outstanding Dues:</span>
                        <span className="font-mono">+₹{bill.previousDueAdded}</span>
                      </div>
                    )}

                    <div className="flex justify-between w-64 text-slate-800 font-black text-sm pt-1 border-t border-slate-100 mt-1">
                      <span>Final Amount:</span>
                      <span className="font-mono">₹{grandTotal}</span>
                    </div>
                    
                    <div className="flex justify-between w-64 text-slate-500 font-semibold">
                      <span>Advance Received:</span>
                      <span className="font-mono text-green-700 font-extrabold">₹{bill.advanceReceived || 0}</span>
                    </div>

                    {Number(bill.advanceReceived || 0) > 0 && (
                      <div className="flex justify-between w-64 text-slate-400 font-medium text-xs">
                        <span>Advance Payment Mode:</span>
                        <span className="font-bold">
                          {bill.advances?.[0]?.paymentMode || bill.payments?.find(p => p.notes === 'Advance' || p.notes === 'Advance payment')?.paymentMethod || 'N/A'}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between w-64 text-slate-900 font-black text-lg pt-1 border-t border-slate-100 mt-1">
                      <span>Remaining Amount:</span>
                      <span className="font-mono text-blue-600 font-black">₹{bill.remainingAmount}</span>
                    </div>

                    {bill.remainingAmount > 0 && bill.expectedPaymentDate && (
                      <div className="flex justify-between w-64 text-amber-600 font-bold text-xs py-1">
                        <span>Expected Payment Date:</span>
                        <span>
                          {new Date(bill.expectedPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* v1.1 Payment Audit Log */}
            {bill.payments && bill.payments.length > 0 && viewMode === 'combined' && (
              <div className="py-5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Collection Log</h3>
                <div className="space-y-2">
                  {bill.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-800">
                          {p.paymentMethod} Payment — <span className="text-green-700">₹{p.amount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Date: {new Date(p.paymentDate).toLocaleDateString('en-GB')} {p.notes ? `| Note: ${p.notes}` : ''}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id)}
                        className="no-print h-7 w-7 flex items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue alert and followup date */}
            {bill.paymentStatus !== 'PAID' && (bill.expectedPaymentDate || bill.paymentNotes) && viewMode === 'combined' && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 mt-4 text-xs text-slate-800 flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-800">Pending Balance Follow-up</div>
                  {bill.expectedPaymentDate && (
                    <div>
                      Expected Payment Date:{' '}
                      <span className="font-bold">
                        {new Date(bill.expectedPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {bill.followupReminderDate && (
                    <div>
                      Follow-up Reminder Date:{' '}
                      <span className="font-bold">
                        {new Date(bill.followupReminderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {bill.paymentNotes && (
                    <div className="text-slate-600 italic mt-0.5">Notes: {bill.paymentNotes}</div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Notes / Remarks */}
            {bill.notes && viewMode !== 'labour' && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4 text-xs mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remarks</span>
                <p className="text-slate-600 font-semibold italic">{bill.notes}</p>
              </div>
            )}

            {/* Service Notes */}
            {bill.showServiceNotes && bill.serviceNotes && viewMode !== 'labour' && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 text-xs mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Service Notes</span>
                <p className="text-slate-600 font-semibold italic">{bill.serviceNotes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-dashed border-slate-200 mt-4 space-y-2">
              <p className="text-base font-bold text-slate-800">Thank You!</p>
              
              {settings.footerMessage && viewMode !== 'labour' && (
                <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                  {settings.footerMessage}
                </p>
              )}

              {settings.warrantyNotes && viewMode !== 'labour' && (
                <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
                  Warranty: {settings.warrantyNotes}
                </p>
              )}

              {viewMode !== 'labour' && (settings.whatsappNumber || settings.socialMedia) && (
                <div className="flex justify-center gap-4 text-xs text-slate-400 font-bold mt-1">
                  {settings.whatsappNumber && (
                    <span>WhatsApp: {settings.whatsappNumber}</span>
                  )}
                  {settings.socialMedia && (
                    <span>Social: {settings.socialMedia}</span>
                  )}
                </div>
              )}

              <p className="text-sm font-bold text-slate-500 italic mt-2">Visit Again!</p>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
