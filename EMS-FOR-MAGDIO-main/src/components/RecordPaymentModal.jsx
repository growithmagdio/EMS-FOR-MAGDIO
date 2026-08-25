import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, DollarSign, Calendar, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateDocument, addDocument } from '../utils/dbUtils';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  invoice
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !invoice) return null;

  const currencySymbol = invoice.currencySymbol || '$';
  const balanceDue = Number(invoice.balanceDue ?? (invoice.totalAmount - (invoice.amountPaid || 0)));

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      amount: balanceDue > 0 ? balanceDue : invoice.totalAmount,
      date: new Date().toISOString().split('T')[0],
      method: 'Bank Transfer',
      reference: '',
      notes: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const paymentAmount = Number(data.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      const currentPaid = Number(invoice.amountPaid || 0);
      const newAmountPaid = Number((currentPaid + paymentAmount).toFixed(2));
      const newBalanceDue = Math.max(0, Number((invoice.totalAmount - newAmountPaid).toFixed(2)));

      const newStatus = newBalanceDue === 0 ? 'Paid' : 'Partially Paid';

      const newPaymentRecord = {
        id: `pay-${Date.now()}`,
        amount: paymentAmount,
        date: data.date,
        method: data.method,
        reference: data.reference.trim(),
        notes: data.notes.trim(),
        recordedAt: new Date().toISOString()
      };

      const existingPayments = Array.isArray(invoice.payments) ? invoice.payments : [];
      const updatedPayments = [...existingPayments, newPaymentRecord];

      // 1. Update Invoice
      await updateDocument('invoices', invoice.id, {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        payments: updatedPayments,
        updatedAt: new Date().toISOString()
      });

      // 2. Also log to Income collection for Accounts Management
      await addDocument('income', {
        incomeId: `INC-INV-${String(Date.now()).slice(-6)}`,
        date: data.date,
        clientId: invoice.clientId || '',
        clientName: invoice.clientCompany || invoice.clientName || 'Client',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        description: `Customer payment on Invoice #${invoice.invoiceNumber}`,
        amount: paymentAmount,
        paymentMethod: data.method,
        transactionReference: data.reference.trim(),
        status: 'Received',
        notes: data.notes.trim(),
        updatedAt: new Date().toISOString()
      });

      // 3. Also log to unified Payments collection
      await addDocument('payments', {
        paymentId: `PAY-${Date.now()}`,
        date: data.date,
        type: 'Customer Payment',
        relatedInvoiceId: invoice.id,
        name: invoice.clientCompany || invoice.clientName || 'Client',
        amount: paymentAmount,
        paymentMethod: data.method,
        transactionReference: data.reference.trim(),
        notes: data.notes.trim(),
        createdAt: new Date().toISOString()
      });

      toast.success(`Payment of ${currencySymbol}${paymentAmount} recorded successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-emerald-600 px-6 sm:px-8 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Record Payment
            </h2>
            <p className="text-emerald-100 text-xs mt-0.5">
              Invoice #{invoice.invoiceNumber} • {invoice.clientCompany}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-5">
          {/* Balance overview banner */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center text-sm">
            <div>
              <p className="text-xs text-emerald-700 font-medium">Total Invoice Amount</p>
              <p className="text-lg font-bold text-gray-900">
                {currencySymbol}{Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-rose-600 font-medium">Remaining Balance Due</p>
              <p className="text-lg font-extrabold text-rose-600">
                {currencySymbol}{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Payment Amount ({currencySymbol}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                {currencySymbol}
              </div>
              <input
                {...register('amount', {
                  required: 'Payment amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                })}
                type="number"
                step="any"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('date', { required: 'Date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                {...register('method')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bank Transfer">Bank Transfer (Wire/ACH)</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit / Debit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Reference / Transaction ID
            </label>
            <input
              {...register('reference')}
              type="text"
              placeholder="e.g. TXN-98421045 or Cheque #1042"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Payment Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional notes regarding this payment installment..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 resize-none"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
