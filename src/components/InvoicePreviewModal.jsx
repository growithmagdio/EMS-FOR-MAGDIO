import { useState, useRef } from 'react';
import { X, Printer, Share2, Download, Check, Building2, Mail, Phone, MapPin, Calendar, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const currencySymbol = invoice.currencySymbol || '$';
  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const balanceDue = Number(invoice.balanceDue ?? (totalAmount - amountPaid));

  const shareableUrl = `${window.location.origin}/invoice/${invoice.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    toast.success('Public invoice link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      toast.loading('Generating PDF...', { id: 'pdf-gen' });
      await downloadInvoicePDF(invoice);
      toast.success('Invoice downloaded successfully', { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error generating PDF in InvoicePreviewModal:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-gen' });
    } finally {
      setDownloading(false);
    }
  };



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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col my-auto border border-gray-100 overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-gray-900 px-6 sm:px-8 py-4 text-white flex justify-between items-center z-10 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">Invoice Preview</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-700"
              title="Copy shareable link for client"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share Link'}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
              title="Download Invoice as PDF"
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

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div ref={printRef} className="p-6 sm:p-12 overflow-y-auto flex-1 bg-white text-gray-800 font-sans print:p-8">

          {/* Header row: Brand & Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-8">
            <div>
              <div className="flex items-center gap-3">
                <img 
                  src="/favicon.svg" 
                  alt="MAGDIO Logo" 
                  className="w-12 h-12 rounded-2xl object-contain shadow-md shadow-purple-500/20 print:shadow-none"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.classList.remove('hidden');
                    }
                  }}
                />
                <div className="w-12 h-12 bg-purple-600 rounded-2xl hidden items-center justify-center shadow-lg shadow-purple-500/20 print:shadow-none">
                  <span className="text-white font-black text-2xl tracking-tighter">M</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-gray-900">MAGDIO</h1>
                  <p className="text-xs uppercase font-bold tracking-widest text-purple-600">Enterprise Solutions</p>
                </div>
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
                    Payment / Wire Instructions
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

          {/* Payment History Record Table (if applicable) */}
          {Array.isArray(invoice.payments) && invoice.payments.length > 0 && (
            <div className="mt-10 pt-6 border-t border-gray-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Payment History Logs ({invoice.payments.length})
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

          {/* Signature / Footer Signoff */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-700">Authorized Signature</p>
              <div className="h-12 w-40 border-b border-gray-300 mt-2"></div>
              <p className="mt-1 text-[10px] text-gray-400">For MAGDIO Software Solutions</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="font-medium text-gray-800">Thank you for choosing MAGDIO!</p>
              <p className="text-[10px] text-gray-400">Questions? Reach out to support@magdio.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
