import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, DollarSign, Calendar, Building2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateDocument, addDocument } from '../../utils/dbUtils';

export default function RecordPayablePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  payable
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !payable) return null;

  const balanceDue = Number(payable.balanceDue ?? (payable.amount - (payable.amountPaid || 0)));

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      amount: balanceDue > 0 ? balanceDue : payable.amount,
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

      const currentPaid = Number(payable.amountPaid || 0);
      const newAmountPaid = Number((currentPaid + paymentAmount).toFixed(2));
      const newBalanceDue = Math.max(0, Number((payable.amount - newAmountPaid).toFixed(2)));

      const newStatus = newBalanceDue === 0 ? 'Paid' : 'Partially Paid';

      const paymentRecord = {
        id: `pay-bill-${Date.now()}`,
        amount: paymentAmount,
        date: data.date,
        method: data.method,
        reference: data.reference.trim(),
        notes: data.notes.trim(),
        recordedAt: new Date().toISOString()
      };

      const existingPayments = Array.isArray(payable.payments) ? payable.payments : [];
      const updatedPayments = [...existingPayments, paymentRecord];

      // 1. Update the payable document
      await updateDocument('payables', payable.id, {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        payments: updatedPayments,
        updatedAt: new Date().toISOString()
      });

      // 2. Also log an expense record for financial reporting
      await addDocument('expenses', {
        expenseId: `EXP-BILL-${String(Date.now()).slice(-6)}`,
        date: data.date,
        category: 'Vendor Payment',
        vendor: payable.vendor || 'Vendor',
        description: `Payment for Bill #${payable.billNumber} (${payable.description || 'Vendor Service'})`,
        amount: paymentAmount,
        paymentMethod: data.method,
        transactionReference: data.reference.trim(),
        status: 'Paid',
        notes: `Recorded against Payable Bill #${payable.billNumber}. ${data.notes || ''}`,
        updatedAt: new Date().toISOString()
      });

      // 3. Log to payments collection
      await addDocument('payments', {
        paymentId: `PAY-${Date.now()}`,
        date: data.date,
        type: 'Vendor Payment',
        relatedBillId: payable.id,
        name: payable.vendor,
        amount: paymentAmount,
        paymentMethod: data.method,
        transactionReference: data.reference.trim(),
        notes: data.notes.trim(),
        createdAt: new Date().toISOString()
      });

      toast.success(`Payment of $${paymentAmount.toLocaleString()} recorded for ${payable.vendor}!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording vendor payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-amber-600 px-6 sm:px-8 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Pay Vendor Bill
            </h2>
            <p className="text-amber-100 text-xs mt-0.5">
              Bill #{payable.billNumber} • {payable.vendor}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-amber-200 hover:text-white hover:bg-amber-700/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-5">
          {/* Overview banner */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex justify-between items-center text-sm">
            <div>
              <p className="text-xs text-amber-700 font-medium">Total Bill Amount</p>
              <p className="text-lg font-bold text-gray-900">
                ${Number(payable.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-rose-600 font-medium">Outstanding Balance</p>
              <p className="text-lg font-extrabold text-rose-600">
                ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Payment Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              {...register('amount', {
                required: 'Payment amount is required',
                min: { value: 0.01, message: 'Amount must be greater than 0' }
              })}
              type="number"
              step="any"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              placeholder="0.00"
            />
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
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                {...register('method')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="Bank Transfer">Bank Transfer (Wire/ACH)</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit / Debit Card</option>
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
              placeholder="e.g. TXN-VENDOR-88219"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Payment Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional notes or confirmation codes..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 resize-none"
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
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
