import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, Share2, Mail, Phone, MapPin, Check, AlertCircle, Clock, FileText, CheckCircle2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

export default function PublicInvoiceView() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const docRef = doc(db, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && !docSnap.data().isDeleted) {
          setInvoice({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Invoice not found or has been removed.');
        }
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice details. Please verify the link.');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      toast.loading('Generating PDF...', { id: 'public-pdf-gen' });
      await downloadInvoicePDF(invoice);
      toast.success('Invoice downloaded successfully', { id: 'public-pdf-gen' });
    } catch (err) {
      console.error('Error downloading PDF in PublicInvoiceView:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: 'public-pdf-gen' });
    } finally {
      setDownloading(false);
    }
  };




  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Unavailable</h2>
          <p className="text-gray-600 mb-6 text-sm">{error || 'Invoice not found.'}</p>
          <Link
            to="/login"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm inline-block transition-colors"
          >
            Go to Portal
          </Link>
        </div>
      </div>
    );
  }

  const currencySymbol = invoice.currencySymbol || '$';
  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const balanceDue = Number(invoice.balanceDue ?? (totalAmount - amountPaid));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Sent':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100/70 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Floating Action Bar */}
        <div className="bg-white/90 backdrop-blur-md px-6 py-3.5 rounded-2xl shadow-sm border border-gray-200/80 flex flex-wrap justify-between items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MAGDIO" className="h-8 object-contain p-1 bg-[#0b0e1b] rounded-lg shadow-sm" />
            <div>
              <span className="font-bold text-gray-900 text-sm">Invoice #{invoice.invoiceNumber}</span>
              <span className="text-xs text-gray-500 block">From MAGDIO Software Solutions</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-200 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied' : 'Share'}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
            >
              {downloading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* The Invoice Sheet */}
        <div ref={sheetRef} className="bg-white rounded-3xl shadow-xl border border-gray-200/60 p-6 sm:p-12 print:border-none print:shadow-none print:p-6 print:rounded-none">

          {/* Header row: Brand & Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-8">
            <div>
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="MAGDIO" className="h-12 object-contain p-2 bg-[#0b0e1b] rounded-2xl shadow-md" />
              </div>

              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p>MAGDIO Software Solutions Pvt Ltd</p>
                <p>Support & Billing: support@magdio.com</p>
                <p>Web: www.magdio.com</p>
              </div>
            </div>

            <div className="sm:text-right">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight uppercase">INVOICE</h2>
              <p className="text-sm font-mono font-bold text-blue-600 mt-1">#{invoice.invoiceNumber}</p>
              
              <div className="mt-4 space-y-1 text-xs text-gray-600 sm:text-right">
                <p><span className="font-semibold text-gray-800">Issue Date:</span> {invoice.issueDate}</p>
                <p><span className="font-semibold text-gray-800">Due Date:</span> {invoice.dueDate}</p>
                {invoice.projectName && (
                  <p><span className="font-semibold text-gray-800">Project:</span> {invoice.projectName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bill To & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8">
            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Billed To</span>
              <h3 className="text-lg font-bold text-gray-900">{invoice.clientCompany}</h3>
              <p className="text-sm font-medium text-gray-700 mt-0.5">Attn: {invoice.clientName}</p>
              {invoice.clientEmail && (
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {invoice.clientEmail}
                </p>
              )}
              {invoice.clientPhone && (
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {invoice.clientPhone}
                </p>
              )}
              {invoice.clientAddress && (
                <p className="text-xs text-gray-600 mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" /> {invoice.clientAddress}
                </p>
              )}
            </div>

            <div className="flex flex-col justify-between sm:items-end p-5 bg-blue-50/40 rounded-2xl border border-blue-100/60">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block sm:text-right mb-1">
                  Payment Status
                </span>
                <div className="sm:text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getStatusBadge(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>

              <div className="sm:text-right mt-4">
                <span className="text-xs text-gray-500 block">Total Due ({invoice.currency || 'USD'})</span>
                <span className="text-2xl sm:text-3xl font-black text-gray-900">
                  {currencySymbol}{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900 text-xs font-bold uppercase tracking-wider text-gray-700">
                  <th className="py-3 px-2">#</th>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4 text-center">Qty / Hrs</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(invoice.items || []).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="py-4 px-2 text-xs font-mono text-gray-400">{index + 1}</td>
                    <td className="py-4 px-4 font-medium text-gray-900">
                      {item.description}
                    </td>
                    <td className="py-4 px-4 text-center text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {currencySymbol}{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-gray-900">
                      {currencySymbol}{Number(item.total || (item.quantity * item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation Box */}
          <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Payment Details & Notes */}
            <div className="md:col-span-7 space-y-4 text-xs">
              {invoice.bankDetails && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Payment Instructions
                  </h4>
                  <pre className="font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {invoice.bankDetails}
                  </pre>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-1">Notes & Terms</h4>
                  <p className="text-gray-600 leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="md:col-span-5 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">
                  {currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-700 font-medium">
                  <span>Discount</span>
                  <span>-{currencySymbol}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>+{currencySymbol}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Grand Total</span>
                <span className="text-2xl font-black text-gray-900">
                  {currencySymbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {amountPaid > 0 && (
                <div className="border-t border-dashed border-gray-200 pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Total Paid</span>
                    <span>{currencySymbol}{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-black text-sm">
                    <span>Remaining Balance</span>
                    <span>{currencySymbol}{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment History Record Table */}
          {Array.isArray(invoice.payments) && invoice.payments.length > 0 && (
            <div className="mt-10 pt-6 border-t border-gray-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Payments Recorded ({invoice.payments.length})
              </h4>
              <div className="bg-gray-50 rounded-xl border border-gray-200/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/80 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/60">
                    {invoice.payments.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-4 font-mono text-gray-700">{p.date}</td>
                        <td className="py-2.5 px-4 font-medium text-gray-800">{p.method}</td>
                        <td className="py-2.5 px-4 text-gray-500 font-mono">{p.reference || '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          {currencySymbol}{Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-12 pt-8 border-t border-gray-100 text-center text-xs text-gray-500">
            <p className="font-medium text-gray-800">Thank you for your business!</p>
            <p className="text-[10px] text-gray-400 mt-1">
              For any questions concerning this invoice, please contact support@magdio.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
