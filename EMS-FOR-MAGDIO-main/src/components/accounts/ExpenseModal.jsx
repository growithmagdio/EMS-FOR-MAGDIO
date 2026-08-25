import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, TrendingDown, Calendar, Building2, Tag, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDocument, updateDocument } from '../../utils/dbUtils';

const DEFAULT_CATEGORIES = [
  'Salary',
  'Software',
  'Marketing',
  'Office',
  'Internet',
  'Travel',
  'Equipment',
  'Utilities',
  'Professional Services',
  'Other'
];

export default function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  editingExpense = null
}) {
  const [loading, setLoading] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(
    editingExpense?.category && !DEFAULT_CATEGORIES.includes(editingExpense.category)
  );

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      expenseId: editingExpense?.expenseId || `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      date: editingExpense?.date || new Date().toISOString().split('T')[0],
      category: editingExpense?.category || 'Software',
      customCategory: !DEFAULT_CATEGORIES.includes(editingExpense?.category) ? editingExpense?.category || '' : '',
      vendor: editingExpense?.vendor || '',
      description: editingExpense?.description || '',
      amount: editingExpense?.amount || '',
      paymentMethod: editingExpense?.paymentMethod || 'Bank Transfer',
      transactionReference: editingExpense?.transactionReference || '',
      status: editingExpense?.status || 'Paid',
      receiptUrl: editingExpense?.receiptUrl || '',
      notes: editingExpense?.notes || ''
    }
  });

  const watchedCategory = watch('category');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Please enter a valid expense amount greater than 0');
        return;
      }

      const finalCategory = data.category === 'Other' && data.customCategory?.trim()
        ? data.customCategory.trim()
        : data.category;

      const expenseData = {
        expenseId: data.expenseId.trim(),
        date: data.date,
        category: finalCategory,
        vendor: data.vendor.trim(),
        description: data.description.trim(),
        amount: parsedAmount,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference.trim(),
        status: data.status,
        receiptUrl: data.receiptUrl.trim(),
        notes: data.notes.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingExpense) {
        await updateDocument('expenses', editingExpense.id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await addDocument('expenses', expenseData);
        toast.success('Expense recorded successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-rose-600 px-6 sm:px-8 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="w-6 h-6" />
              {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
            </h2>
            <p className="text-rose-100 text-xs mt-0.5">
              Track operational costs, software subscriptions, office supplies, and team salaries
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-rose-200 hover:text-white hover:bg-rose-700/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Expense ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('expenseId', { required: 'Expense ID is required' })}
                type="text"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
              {errors.expenseId && <p className="text-red-500 text-xs mt-1">{errors.expenseId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('date', { required: 'Date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Expense Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register('category')}
                onChange={(e) => {
                  setValue('category', e.target.value);
                  setIsCustomCategory(e.target.value === 'Other');
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              >
                {DEFAULT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Vendor / Service Provider <span className="text-red-500">*</span>
              </label>
              <input
                {...register('vendor', { required: 'Vendor name is required' })}
                type="text"
                placeholder="e.g. AWS, Adobe, Google Workspace, Office Landlord"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
              {errors.vendor && <p className="text-red-500 text-xs mt-1">{errors.vendor.message}</p>}
            </div>
          </div>

          {/* Custom Category Input if "Other" is selected */}
          {(watchedCategory === 'Other' || isCustomCategory) && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Specify Custom Category
              </label>
              <input
                {...register('customCategory')}
                type="text"
                placeholder="e.g. Client Entertainment, Team Lunch, Server Migration"
                className="w-full px-3.5 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              {...register('description', { required: 'Description is required' })}
              type="text"
              placeholder="e.g. Cloud server hosting and backup infrastructure for May 2026"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Must be > 0' }
                })}
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500 font-medium"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Transaction Ref #
              </label>
              <input
                {...register('transactionReference')}
                type="text"
                placeholder="e.g. TXN-894212"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Receipt / Invoice URL
              </label>
              <input
                {...register('receiptUrl')}
                type="text"
                placeholder="https://drive.google.com/... or Receipt note"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional notes or context..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500 resize-none"
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
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md shadow-rose-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {editingExpense ? 'Update Expense' : 'Record Expense'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
