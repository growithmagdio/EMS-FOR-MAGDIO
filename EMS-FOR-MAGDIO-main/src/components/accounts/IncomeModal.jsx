import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, DollarSign, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDocument, updateDocument } from '../../utils/dbUtils';

export default function IncomeModal({
  isOpen,
  onClose,
  onSuccess,
  editingIncome = null,
  clients = [],
  invoices = []
}) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      incomeId: editingIncome?.incomeId || `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      date: editingIncome?.date || new Date().toISOString().split('T')[0],
      clientId: editingIncome?.clientId || '',
      invoiceId: editingIncome?.invoiceId || '',
      description: editingIncome?.description || '',
      amount: editingIncome?.amount || '',
      paymentMethod: editingIncome?.paymentMethod || 'Bank Transfer',
      transactionReference: editingIncome?.transactionReference || '',
      status: editingIncome?.status || 'Received',
      notes: editingIncome?.notes || ''
    }
  });

  const watchedClientId = watch('clientId');
  const watchedInvoiceId = watch('invoiceId');

  // Filter invoices for selected client
  const clientInvoices = invoices.filter(inv => !watchedClientId || inv.clientId === watchedClientId);

  // Auto-fill invoice details when invoice selected
  useEffect(() => {
    if (watchedInvoiceId) {
      const inv = invoices.find(i => i.id === watchedInvoiceId);
      if (inv) {
        setValue('invoiceNumber', inv.invoiceNumber);
        if (!watch('description')) {
          setValue('description', `Payment for Invoice #${inv.invoiceNumber}`);
        }
        if (!watch('amount') && inv.balanceDue) {
          setValue('amount', inv.balanceDue);
        }
        if (!watchedClientId && inv.clientId) {
          setValue('clientId', inv.clientId);
        }
      }
    }
  }, [watchedInvoiceId, invoices, setValue, watch, watchedClientId]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }

      const client = clients.find(c => c.id === data.clientId);
      const invoice = invoices.find(i => i.id === data.invoiceId);

      const incomeData = {
        incomeId: data.incomeId.trim(),
        date: data.date,
        clientId: data.clientId || '',
        clientName: client?.companyName || client?.name || 'Direct / Miscellaneous Client',
        invoiceId: data.invoiceId || '',
        invoiceNumber: invoice?.invoiceNumber || '',
        description: data.description.trim(),
        amount: parsedAmount,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference.trim(),
        status: data.status,
        notes: data.notes.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingIncome) {
        await updateDocument('income', editingIncome.id, incomeData);
        toast.success('Income entry updated successfully');
      } else {
        await addDocument('income', incomeData);
        toast.success('Income entry recorded successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving income:', error);
      toast.error('Failed to save income record');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-emerald-600 px-6 sm:px-8 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              {editingIncome ? 'Edit Income Entry' : 'Record New Income'}
            </h2>
            <p className="text-emerald-100 text-xs mt-0.5">
              Log incoming client revenue, project milestones, or miscellaneous earnings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Income ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('incomeId', { required: 'Income ID is required' })}
                type="text"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
              {errors.incomeId && <p className="text-red-500 text-xs mt-1">{errors.incomeId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('date', { required: 'Date is required' })}
                type="date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Client (Optional)
              </label>
              <select
                {...register('clientId')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Direct / No Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName} ({c.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Related Invoice (Optional)
              </label>
              <select
                {...register('invoiceId')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- No Related Invoice --</option>
                {clientInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    #{inv.invoiceNumber} • {inv.clientCompany} (${Number(inv.totalAmount).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              {...register('description', { required: 'Description is required' })}
              type="text"
              placeholder="e.g. Monthly Retainer - UI/UX Design & Cloud Hosting"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
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
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Transaction Reference / Ref #
            </label>
            <input
              {...register('transactionReference')}
              type="text"
              placeholder="e.g. TXN-10492810"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional notes or memos..."
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
                  {editingIncome ? 'Update Income' : 'Record Income'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
