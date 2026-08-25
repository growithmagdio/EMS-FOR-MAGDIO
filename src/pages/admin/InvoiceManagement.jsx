import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Filter, 
  Receipt, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Edit2, 
  Trash2, 
  CreditCard, 
  Share2, 
  ArrowUpDown, 
  Building2, 
  ExternalLink,
  MoreVertical,
  Calendar,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { softDeleteDocument, updateDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import InvoiceModal from '../../components/InvoiceModal';
import InvoicePreviewModal from '../../components/InvoicePreviewModal';
import RecordPaymentModal from '../../components/RecordPaymentModal';
import { downloadInvoicePDF } from '../../utils/pdfGenerator';


export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  // Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [invoiceToPreview, setInvoiceToPreview] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadPDF = async (invoice) => {
    try {
      setDownloadingId(invoice.id);
      toast.loading('Generating PDF...', { id: `pdf-${invoice.id}` });
      await downloadInvoicePDF(invoice);
      toast.success('Invoice downloaded successfully', { id: `pdf-${invoice.id}` });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: `pdf-${invoice.id}` });
    } finally {
      setDownloadingId(null);
    }
  };


  // Fetch all necessary data
  const fetchData = async () => {

    try {
      // 1. Fetch Invoices
      const invSnap = await getDocs(collection(db, 'invoices'));
      const todayStr = new Date().toISOString().split('T')[0];
      
      const invList = invSnap.docs
        .map(doc => {
          const data = doc.data();
          let status = data.status || 'Draft';
          const balance = Number(data.balanceDue ?? (data.totalAmount - (data.amountPaid || 0)));
          
          // Auto-detect overdue status if past due and unpaid
          if (data.dueDate && data.dueDate < todayStr && balance > 0 && status !== 'Draft' && status !== 'Cancelled') {
            status = 'Overdue';
          }
          return { id: doc.id, ...data, status };
        })
        .filter(inv => !inv.isDeleted);

      setInvoices(invList);

      // 2. Fetch Clients
      const clientSnap = await getDocs(collection(db, 'clients'));
      const clientList = clientSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => !c.isDeleted);
      setClients(clientList);

      // 3. Fetch Projects
      const projSnap = await getDocs(collection(db, 'projects'));
      const projList = projSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => !p.isDeleted);
      setProjects(projList);
    } catch (error) {
      console.error('Error loading invoices data:', error);
      toast.error('Failed to load invoice records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Next Sequential Invoice Number
  const nextInvoiceNumber = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;
    const matching = invoices
      .map(i => i.invoiceNumber)
      .filter(num => typeof num === 'string' && num.startsWith(prefix));
    
    let maxSeq = 0;
    matching.forEach(num => {
      const parts = num.split('-');
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }, [invoices]);

  // Compute Summary KPI Stats
  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let totalReceived = 0;
    let pendingDue = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    invoices.forEach(inv => {
      const total = Number(inv.totalAmount || 0);
      const paid = Number(inv.amountPaid || 0);
      const balance = Number(inv.balanceDue ?? (total - paid));

      if (inv.status !== 'Cancelled') {
        totalInvoiced += total;
        totalReceived += paid;
        pendingDue += balance;

        if (inv.status === 'Overdue' && balance > 0) {
          overdueCount += 1;
          overdueAmount += balance;
        }
      }
    });

    return {
      totalInvoiced,
      totalReceived,
      pendingDue,
      overdueCount,
      overdueAmount
    };
  }, [invoices]);

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        // Status filter
        if (statusFilter !== 'All' && inv.status !== statusFilter) {
          return false;
        }
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
          const matchCompany = inv.clientCompany?.toLowerCase().includes(q);
          const matchClient = inv.clientName?.toLowerCase().includes(q);
          const matchProject = inv.projectName?.toLowerCase().includes(q);
          return matchNum || matchCompany || matchClient || matchProject;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.issueDate || 0) - new Date(a.issueDate || 0);
        }
        if (sortBy === 'date-asc') {
          return new Date(a.issueDate || 0) - new Date(b.issueDate || 0);
        }
        if (sortBy === 'amount-desc') {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        if (sortBy === 'amount-asc') {
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        }
        return 0;
      });
  }, [invoices, statusFilter, searchTerm, sortBy]);

  // Delete invoice
  const confirmDelete = async () => {
    try {
      await softDeleteDocument('invoices', invoiceToDelete);
      toast.success('Invoice deleted successfully');
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Quick Status Change Handler
  const handleQuickStatusChange = async (invoice, newStatus) => {
    try {
      await updateDocument('invoices', invoice.id, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Sent':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-600" />
            Invoice Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, track, and manage client billings, payments, and printable invoices
          </p>
        </div>

        <button
          onClick={() => {
            setEditingInvoice(null);
            setIsInvoiceModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Create Invoice
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Invoiced</p>
              <h3 className="text-2xl font-black text-gray-900">
                ${stats.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Across {invoices.length} active invoices</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Total Received</p>
              <h3 className="text-2xl font-black text-emerald-600">
                ${stats.totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-emerald-700/80 mt-3 font-medium">Collected revenue</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Pending Balance</p>
              <h3 className="text-2xl font-black text-amber-600">
                ${stats.pendingDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-amber-700/80 mt-3 font-medium">Awaiting payment</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">Overdue Amount</p>
              <h3 className="text-2xl font-black text-rose-600">
                ${stats.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-rose-600 mt-3 font-medium">{stats.overdueCount} past due invoices</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, client name, company, or project..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Status Tabs / Select */}
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {status}
            </button>
          ))}

          {/* Sort Dropdown */}
          <div className="relative ml-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Cards / Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No invoices found</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'All'
                ? 'Try adjusting your search criteria or status filters.'
                : 'Click "Create Invoice" to generate your first client invoice.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="py-4 px-6">Invoice #</th>
                  <th className="py-4 px-6">Client / Company</th>
                  <th className="py-4 px-6">Dates</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Balance Due</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredInvoices.map((invoice) => {
                  const symbol = invoice.currencySymbol || '$';
                  const balance = Number(invoice.balanceDue ?? (invoice.totalAmount - (invoice.amountPaid || 0)));

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Invoice Number */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            setInvoiceToPreview(invoice);
                            setPreviewModalOpen(true);
                          }}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                        >
                          {invoice.invoiceNumber}
                        </button>
                        {invoice.projectName && (
                          <span className="text-xs text-gray-400 block mt-0.5 truncate max-w-[150px]">
                            {invoice.projectName}
                          </span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{invoice.clientCompany}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{invoice.clientName}</div>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-6 text-xs text-gray-600">
                        <div className="flex items-center gap-1 text-gray-900 font-medium">
                          <span>Issued:</span> {invoice.issueDate}
                        </div>
                        <div className={`mt-0.5 ${invoice.status === 'Overdue' ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                          <span>Due:</span> {invoice.dueDate}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-6">
                        <span className="font-black text-gray-900 text-base">
                          {symbol}{Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-gray-400 block">{invoice.currency || 'USD'}</span>
                      </td>

                      {/* Balance Due */}
                      <td className="py-4 px-6">
                        <span className={`font-bold text-sm ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {symbol}{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {invoice.amountPaid > 0 && (
                          <span className="text-[11px] text-gray-400 block">
                            Paid: {symbol}{Number(invoice.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview / Print */}
                          <button
                            onClick={() => {
                              setInvoiceToPreview(invoice);
                              setPreviewModalOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Preview / Print Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            disabled={downloadingId === invoice.id}
                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                            title="Download Invoice as PDF"
                          >
                            {downloadingId === invoice.id ? (
                              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>


                          {/* Record Payment */}
                          {balance > 0 && invoice.status !== 'Cancelled' && (
                            <button
                              onClick={() => {
                                setInvoiceToPay(invoice);
                                setPaymentModalOpen(true);
                              }}
                              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingInvoice(invoice);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setInvoiceToDelete(invoice.id);
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={fetchData}
          editingInvoice={editingInvoice}
          clients={clients}
          projects={projects}
          nextInvoiceNumber={nextInvoiceNumber}
        />
      )}

      {previewModalOpen && invoiceToPreview && (
        <InvoicePreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setInvoiceToPreview(null);
          }}
          invoice={invoiceToPreview}
        />
      )}

      {paymentModalOpen && invoiceToPay && (
        <RecordPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setInvoiceToPay(null);
          }}
          onSuccess={fetchData}
          invoice={invoiceToPay}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName="this invoice"
      />
    </div>
  );
}
