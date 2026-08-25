import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDocument, updateDocument } from '../../utils/dbUtils';

export default function PayableModal({
  isOpen,
  onClose,
  onSuccess,
  editingPayable = null
}) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      billId: editingPayable?.billId || `BILL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      vendor: editingPayable?.vendor || '',
      billNumber: editingPayable?.billNumber || '',
      description: editingPayable?.description || '',
      billDate: editingPayable?.billDate || new Date().toISOString().split('T')[0],
      dueDate: editingPayable?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      amount: editingPayable?.amount || '',
      paymentMethod: editingPayable?.paymentMethod || 'Bank Transfer',
      status: editingPayable?.status || 'Pending',
      notes: editingPayable?.notes || ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Please enter a valid bill amount greater than 0');
        return;
      }

      const amountPaid = Number(editingPayable?.amountPaid || 0);
      const balanceDue = Math.max(0, Number((parsedAmount - amountPaid).toFixed(2)));
      
      let finalStatus = data.status;
      if (amountPaid >= parsedAmount && parsedAmount > 0) {
        finalStatus = 'Paid';
      } else if (amountPaid > 0 && amountPaid < parsedAmount) {
        finalStatus = 'Partially Paid';
      }

      const payableData = {
        billId: data.billId.trim(),
        vendor: data.vendor.trim(),
        billNumber: data.billNumber.trim(),
        description: data.description.trim(),
        billDate: data.billDate,
        dueDate: data.dueDate,
        amount: parsedAmount,
        amountPaid: amountPaid,
        balanceDue: balanceDue,
        paymentMethod: data.paymentMethod,
        status: finalStatus,
        notes: data.notes.trim(),
        payments: editingPayable?.payments || [],
        updatedAt: new Date().toISOString()
      };

      if (editingPayable) {
        await updateDocument('payables', editingPayable.id, payableData);
        toast.success('Vendor bill updated successfully');
      } else {
        await addDocument('payables', payableData);
        toast.success('Vendor bill recorded successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving payable:', error);
      toast.error('Failed to save vendor bill');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-amber-600 px-6 sm:px-8 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              {editingPayable ? 'Edit Vendor Bill' : 'Record Vendor Bill (Payable)'}
            </h2>
            <p className="text-amber-100 text-xs mt-0.5">
              Track outstanding invoices and liabilities owed to contractors, vendors, and suppliers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-amber-200 hover:text-white hover:bg-amber-700/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Internal Bill ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('billId', { required: 'Bill ID is required' })}
                type="text"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              {errors.billId && <p className="text-red-500 text-xs mt-1">{errors.billId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Vendor Bill / Invoice # <span className="text-red-500">*</span>
              </label>
              <input
                {...register('billNumber', { required: 'Vendor bill number is required' })}
                type="text"
                placeholder="e.g. INV-98231 or BILL-2026"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              {errors.billNumber && <p className="text-red-500 text-xs mt-1">{errors.billNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Vendor / Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('vendor', { required: 'Vendor name is required' })}
                type="text"
                placeholder="e.g. AWS, Figma, Office Space Inc"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              {errors.vendor && <p className="text-red-500 text-xs mt-1">{errors.vendor.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Total Bill Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Must be > 0' }
                })}
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              {...register('description', { required: 'Description is required' })}
              type="text"
              placeholder="e.g. Office Rent for Quarter 2 / Annual Cloud Infrastructure Services"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Bill Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('billDate', { required: 'Bill date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('dueDate', { required: 'Due date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Initial Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional notes or vendor bank details..."
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
                  {editingPayable ? 'Update Bill' : 'Record Bill'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
