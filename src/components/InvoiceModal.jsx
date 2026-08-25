import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Trash2, Calculator, Building2, Calendar, DollarSign, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDocument, updateDocument } from '../utils/dbUtils';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' }
];


export default function InvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  editingInvoice = null,
  clients = [],
  projects = [],
  nextInvoiceNumber = 'INV-2026-0001'
}) {
  const [selectedCurrency, setSelectedCurrency] = useState(
    editingInvoice?.currency || 'USD'
  );

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      invoiceNumber: editingInvoice?.invoiceNumber || nextInvoiceNumber,
      clientId: editingInvoice?.clientId || '',
      projectId: editingInvoice?.projectId || '',
      issueDate: editingInvoice?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: editingInvoice?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      currency: editingInvoice?.currency || 'USD',
      status: editingInvoice?.status || 'Draft',
      discountType: editingInvoice?.discountType || 'percentage',
      discountValue: editingInvoice?.discountValue || 0,
      taxRate: editingInvoice?.taxRate || 0,
      notes: editingInvoice?.notes || 'Thank you for your business. Please reach out if you have any questions regarding this invoice.',
      paymentTerms: editingInvoice?.paymentTerms || 'Payment due within 15 days upon receipt.',
      bankDetails: editingInvoice?.bankDetails || 'Bank: MAGDIO Global Bank\nAccount: 1234-5678-9012\nRouting/IFSC: MAGD0001234\nUPI/PayPal: payments@magdio.com',
      items: editingInvoice?.items?.length ? editingInvoice.items : [
        { description: 'Design & Development Services', quantity: 1, unitPrice: 500, taxRate: 0 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items') || [];
  const watchedDiscountType = watch('discountType');
  const watchedDiscountValue = Number(watch('discountValue') || 0);
  const watchedTaxRate = Number(watch('taxRate') || 0);
  const watchedClientId = watch('clientId');

  // Auto-fill client details when client is selected
  useEffect(() => {
    if (watchedClientId) {
      const client = clients.find(c => c.id === watchedClientId);
      if (client) {
        setValue('clientCompany', client.companyName || '');
        setValue('clientName', client.name || '');
        setValue('clientEmail', client.email || '');
        setValue('clientPhone', client.phone || '');
        setValue('clientAddress', client.address || '');
      }
    }
  }, [watchedClientId, clients, setValue]);

  // Calculate Subtotal, Discounts, Taxes, and Grand Total
  const subtotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  let discountAmount = 0;
  if (watchedDiscountType === 'percentage') {
    discountAmount = (subtotal * Math.min(100, Math.max(0, watchedDiscountValue))) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, watchedDiscountValue));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * Math.max(0, watchedTaxRate)) / 100;
  const totalAmount = Math.max(0, taxableAmount + taxAmount);

  // If editing, preserve recorded amount paid
  const amountPaid = editingInvoice?.amountPaid || 0;
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  const currencyObj = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  const onSubmit = async (data) => {
    try {
      const selectedClient = clients.find(c => c.id === data.clientId);
      const selectedProject = projects.find(p => p.id === data.projectId);

      // Clean line items with calculated row totals
      const formattedItems = (data.items || []).map((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          id: item.id || `item-${Date.now()}-${idx}`,
          description: item.description || 'Service/Item',
          quantity: qty,
          unitPrice: unitPrice,
          total: qty * unitPrice
        };
      });

      // Determine initial or preserved status
      let finalStatus = data.status;
      if (amountPaid >= totalAmount && totalAmount > 0) {
        finalStatus = 'Paid';
      } else if (amountPaid > 0 && amountPaid < totalAmount) {
        finalStatus = 'Partially Paid';
      }

      const invoiceData = {
        invoiceNumber: data.invoiceNumber.trim(),
        clientId: data.clientId,
        clientCompany: selectedClient?.companyName || data.clientCompany || 'Client Company',
        clientName: selectedClient?.name || data.clientName || 'Representative',
        clientEmail: selectedClient?.email || data.clientEmail || '',
        clientPhone: selectedClient?.phone || data.clientPhone || '',
        clientAddress: selectedClient?.address || data.clientAddress || '',
        projectId: data.projectId || '',
        projectName: selectedProject?.name || '',
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        currencySymbol: currencyObj.symbol,
        items: formattedItems,
        subtotal: Number(subtotal.toFixed(2)),
        discountType: data.discountType,
        discountValue: Number(watchedDiscountValue),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxRate: Number(watchedTaxRate),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        amountPaid: Number(amountPaid.toFixed(2)),
        balanceDue: Number(balanceDue.toFixed(2)),
        status: finalStatus,
        notes: data.notes || '',
        paymentTerms: data.paymentTerms || '',
        bankDetails: data.bankDetails || '',
        payments: editingInvoice?.payments || [],
        updatedAt: new Date().toISOString()
      };

      if (editingInvoice) {
        await updateDocument('invoices', editingInvoice.id, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        await addDocument('invoices', invoiceData);
        toast.success('Invoice created! Generating PDF download...');
      }

      // Automatically generate and download the invoice PDF
      try {
        await downloadInvoicePDF(invoiceData);
        toast.success(`Downloaded Invoice #${invoiceData.invoiceNumber}.pdf`);
      } catch (pdfErr) {
        console.error('PDF download error:', pdfErr);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-6 sm:px-8 py-5 flex justify-between items-center z-10 rounded-t-3xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Fill in client information, line items, and payment details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1">
          {/* Section 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                {...register('invoiceNumber', { required: 'Invoice number is required' })}
                type="text"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. INV-2026-0001"
              />
              {errors.invoiceNumber && <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('issueDate', { required: 'Issue date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('dueDate', { required: 'Due date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Section 2: Client & Project Selection */}
          <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/80 space-y-4">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
              <Building2 className="w-4 h-4 text-blue-600" />
              Client & Project Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Client <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('clientId', { required: 'Please select a client' })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.name})
                    </option>
                  ))}
                </select>
                {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Associated Project (Optional)
                </label>
                <select
                  {...register('projectId')}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- None / General Billing --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.client ? `(${p.client})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  {...register('currency')}
                  onChange={(e) => {
                    setValue('currency', e.target.value);
                    setSelectedCurrency(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  Line Items ({fields.length})
                </h3>
                <p className="text-xs text-gray-500">Add services, products, or milestone charges</p>
              </div>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const itemQty = Number(watchedItems[index]?.quantity || 0);
                const itemPrice = Number(watchedItems[index]?.unitPrice || 0);
                const rowTotal = itemQty * itemPrice;

                return (
                  <div
                    key={field.id}
                    className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80 grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register(`items.${index}.description`, { required: 'Description is required' })}
                        type="text"
                        placeholder="e.g. Website UI Design & Prototyping"
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Qty / Hrs
                      </label>
                      <input
                        {...register(`items.${index}.quantity`, { required: true, min: 0.01 })}
                        type="number"
                        step="any"
                        placeholder="1"
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Rate ({currencyObj.symbol})
                      </label>
                      <input
                        {...register(`items.${index}.unitPrice`, { required: true, min: 0 })}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-1.5 flex flex-col justify-end">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Amount
                      </label>
                      <div className="h-9.5 flex items-center font-bold text-gray-900 text-sm truncate">
                        {currencyObj.symbol}{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="col-span-1 sm:col-span-0.5 flex justify-end items-end h-full pt-6">
                      <button
                        type="button"
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={fields.length === 1}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Taxes, Discounts & Summary Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-gray-100">
            {/* Left: Notes & Bank Instructions */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Bank / Payment Instructions
                </label>
                <textarea
                  {...register('bankDetails')}
                  rows={3}
                  placeholder="Bank Name, Account #, SWIFT/IFSC, UPI / PayPal..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Client Notes / Terms
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Notes or terms for the recipient..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>
            </div>

            {/* Right: Financial Totals Card */}
            <div className="lg:col-span-5 bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-3.5">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">
                  {currencyObj.symbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Discount Selector */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-600">
                  <span>Discount</span>
                  <select
                    {...register('discountType')}
                    className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs font-medium"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div className="w-24">
                  <input
                    {...register('discountValue')}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-right font-medium text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-green-700 font-medium">
                  <span>Discount Amount</span>
                  <span>-{currencyObj.symbol}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* Tax / GST Rate */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-600">Tax / VAT / GST (%)</span>
                <div className="w-24">
                  <input
                    {...register('taxRate')}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-right font-medium text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Tax Amount ({watchedTaxRate}%)</span>
                  <span>+{currencyObj.symbol}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Total Amount</span>
                <span className="text-xl font-black text-blue-600">
                  {currencyObj.symbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {amountPaid > 0 && (
                <div className="border-t border-dashed border-gray-200 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Amount Paid</span>
                    <span>{currencyObj.symbol}{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Balance Due</span>
                    <span>{currencyObj.symbol}{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all"
            >
              {editingInvoice ? 'Update Invoice' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
