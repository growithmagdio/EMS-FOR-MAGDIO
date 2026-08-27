import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Edit2, 
  Trash2, 
  Eye, 
  CreditCard, 
  Calendar, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { softDeleteDocument } from '../../utils/dbUtils';

// Subcomponents & Modals
import FinancialChart from '../../components/accounts/FinancialChart';
import IncomeModal from '../../components/accounts/IncomeModal';
import ExpenseModal from '../../components/accounts/ExpenseModal';
import PayableModal from '../../components/accounts/PayableModal';
import RecordPayablePaymentModal from '../../components/accounts/RecordPayablePaymentModal';
import RecordPaymentModal from '../../components/RecordPaymentModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';

export default function AccountsManagement() {
  // Active Tab: 'overview' | 'income' | 'expenses' | 'receivables' | 'payables' | 'payments' | 'transactions' | 'reports'
  const [activeTab, setActiveTab] = useState('overview');

  // Firestore Data
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payables, setPayables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Report Specific Filter
  const [selectedReport, setSelectedReport] = useState('pnl'); // 'pnl' | 'income' | 'expense' | 'receivables' | 'payables' | 'monthly'

  // Modal States
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [payableModalOpen, setPayableModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState(null);

  const [recordPayableModalOpen, setRecordPayableModalOpen] = useState(false);
  const [payableToPay, setPayableToPay] = useState(null);

  const [recordInvoicePaymentModalOpen, setRecordInvoicePaymentModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { collection: string, id: string, name: string }

  // Load all financial records
  const fetchAllAccountsData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch Incomes
      const incomeSnap = await getDocs(collection(db, 'income'));
      const incomeList = incomeSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.isDeleted);
      setIncomes(incomeList);

      // 2. Fetch Expenses
      const expSnap = await getDocs(collection(db, 'expenses'));
      const expList = expSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.isDeleted);
      setExpenses(expList);

      // 3. Fetch Payables
      const paySnap = await getDocs(collection(db, 'payables'));
      const payList = paySnap.docs
        .map(d => {
          const data = d.data();
          let status = data.status || 'Pending';
          const balance = Number(data.balanceDue ?? (data.amount - (data.amountPaid || 0)));
          if (data.dueDate && data.dueDate < todayStr && balance > 0 && status !== 'Paid' && status !== 'Cancelled') {
            status = 'Overdue';
          }
          return { id: d.id, ...data, status, balanceDue: balance };
        })
        .filter(d => !d.isDeleted);
      setPayables(payList);

      // 4. Fetch Invoices (Accounts Receivable)
      const invSnap = await getDocs(collection(db, 'invoices'));
      const invList = invSnap.docs
        .map(d => {
          const data = d.data();
          let status = data.status || 'Draft';
          const balance = Number(data.balanceDue ?? (data.totalAmount - (data.amountPaid || 0)));
          if (data.dueDate && data.dueDate < todayStr && balance > 0 && status !== 'Draft' && status !== 'Cancelled') {
            status = 'Overdue';
          }
          return { id: d.id, ...data, status, balanceDue: balance };
        })
        .filter(d => !d.isDeleted);
      setInvoices(invList);

      // 5. Fetch Payments
      const paymentSnap = await getDocs(collection(db, 'payments'));
      const paymentList = paymentSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.isDeleted);
      setPayments(paymentList);

      // 6. Fetch Clients
      const clientSnap = await getDocs(collection(db, 'clients'));
      const clientList = clientSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.isDeleted);
      setClients(clientList);

    } catch (error) {
      console.error('Error loading accounts data:', error);
      toast.error('Failed to load accounts records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccountsData();
  }, []);

  // Compute Overall KPI Metrics
  const summaryStats = useMemo(() => {
    // Total Income: sum of received income + customer payments
    let totalIncome = 0;
    incomes.forEach(inc => {
      if (inc.status !== 'Cancelled') {
        totalIncome += Number(inc.amount || 0);
      }
    });

    // Total Expenses: sum of expenses
    let totalExpenses = 0;
    expenses.forEach(exp => {
      if (exp.status !== 'Cancelled') {
        totalExpenses += Number(exp.amount || 0);
      }
    });

    const netProfit = totalIncome - totalExpenses;

    // Accounts Receivable: total balance due from all active invoices
    let totalReceivables = 0;
    invoices.forEach(inv => {
      if (inv.status !== 'Cancelled') {
        totalReceivables += Number(inv.balanceDue || 0);
      }
    });

    // Accounts Payable: total balance due on all vendor bills
    let totalPayables = 0;
    payables.forEach(p => {
      if (p.status !== 'Cancelled') {
        totalPayables += Number(p.balanceDue || 0);
      }
    });

    // Pending Payments Count
    const pendingCount = 
      incomes.filter(i => i.status === 'Pending').length +
      expenses.filter(e => e.status === 'Pending').length +
      payables.filter(p => p.status === 'Pending' || p.status === 'Partially Paid').length;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      totalReceivables,
      totalPayables,
      pendingCount
    };
  }, [incomes, expenses, invoices, payables]);

  // Unified Transactions Aggregator
  const allTransactions = useMemo(() => {
    const list = [];

    // Add Incomes
    incomes.forEach(inc => {
      list.push({
        id: inc.id,
        code: inc.incomeId || 'INC',
        date: inc.date,
        type: 'Income',
        category: 'Client Revenue',
        party: inc.clientName || 'Client',
        description: inc.description,
        amount: Number(inc.amount || 0),
        method: inc.paymentMethod || 'Bank Transfer',
        reference: inc.transactionReference || '-',
        status: inc.status,
        raw: inc
      });
    });

    // Add Expenses
    expenses.forEach(exp => {
      list.push({
        id: exp.id,
        code: exp.expenseId || 'EXP',
        date: exp.date,
        type: 'Expense',
        category: exp.category || 'Operating Cost',
        party: exp.vendor || 'Vendor',
        description: exp.description,
        amount: -Number(exp.amount || 0),
        method: exp.paymentMethod || 'Bank Transfer',
        reference: exp.transactionReference || '-',
        status: exp.status,
        raw: exp
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [incomes, expenses]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && t.type !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          t.code?.toLowerCase().includes(q) ||
          t.party?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.reference?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTransactions, statusFilter, categoryFilter, searchTerm]);

  // Delete Action Handler
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await softDeleteDocument(itemToDelete.collection, itemToDelete.id);
      toast.success(`${itemToDelete.name} deleted successfully`);
      fetchAllAccountsData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete item');
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // CSV Export Utility
  const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
      toast.error('No records available to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] ?? '';
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report exported successfully');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
      case 'Received':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
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
      <div className="flex justify-center items-center p-20">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-600" />
            Accounts Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Cashflow control, income tracking, expense management, receivables, payables, and P&L statements
          </p>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setEditingIncome(null);
              setIncomeModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-sm text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Add Income
          </button>

          <button
            onClick={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl shadow-sm text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>

          <button
            onClick={() => {
              setEditingPayable(null);
              setPayableModalOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-2xl shadow-sm text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Add Vendor Bill
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: TrendingUp },
          { id: 'income', label: `Income (${incomes.length})`, icon: DollarSign },
          { id: 'expenses', label: `Expenses (${expenses.length})`, icon: TrendingDown },
          { id: 'receivables', label: `Receivables (${invoices.filter(i => (i.balanceDue || 0) > 0).length})`, icon: Receipt },
          { id: 'payables', label: `Payables (${payables.filter(p => (p.balanceDue || 0) > 0).length})`, icon: Building2 },
          { id: 'transactions', label: `Transactions (${allTransactions.length})`, icon: Clock },
          { id: 'reports', label: 'Financial Reports & P&L', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setStatusFilter('All');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & FINANCIAL DASHBOARD TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Total Income */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Total Income
              </span>
              <h3 className="text-xl font-black text-gray-900">
                ${summaryStats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Revenue & Payments
              </p>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                Total Expenses
              </span>
              <h3 className="text-xl font-black text-gray-900">
                ${summaryStats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1 font-medium">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> Operational Costs
              </p>
            </div>

            {/* Net Profit */}
            <div className={`rounded-3xl p-5 shadow-sm border transition-shadow ${summaryStats.netProfit >= 0 ? 'bg-blue-50/50 border-blue-100' : 'bg-rose-50/50 border-rose-100'}`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${summaryStats.netProfit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                Net Profit
              </span>
              <h3 className={`text-xl font-black ${summaryStats.netProfit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                ${summaryStats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">Income - Expenses</p>
            </div>

            {/* Receivables */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Receivables
              </span>
              <h3 className="text-xl font-black text-indigo-600">
                ${summaryStats.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-400 mt-2 font-medium">Client dues</p>
            </div>

            {/* Payables */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                Payables
              </span>
              <h3 className="text-xl font-black text-amber-600">
                ${summaryStats.totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-400 mt-2 font-medium">Vendor liabilities</p>
            </div>

            {/* Pending Items */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block mb-1">
                Pending Actions
              </span>
              <h3 className="text-xl font-black text-purple-600">
                {summaryStats.pendingCount}
              </h3>
              <p className="text-[11px] text-gray-400 mt-2 font-medium">Awaiting clearing</p>
            </div>
          </div>

          {/* Financial Chart Component */}
          <FinancialChart
            incomes={incomes}
            expenses={expenses}
            invoices={invoices}
          />

          {/* Quick Dual Columns: Outstanding Receivables vs Payables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Outstanding Receivables */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  Top Outstanding Receivables (Invoices)
                </h3>
                <button
                  onClick={() => setActiveTab('receivables')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  View All
                </button>
              </div>

              {invoices.filter(i => (i.balanceDue || 0) > 0).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No outstanding client receivables. All paid up!</p>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {invoices.filter(i => (i.balanceDue || 0) > 0).slice(0, 5).map(inv => (
                    <div key={inv.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">#{inv.invoiceNumber} • {inv.clientCompany}</p>
                        <p className="text-gray-400 mt-0.5">Due: {inv.dueDate}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <span className="font-bold text-rose-600 block">
                            ${Number(inv.balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setInvoiceToPay(inv);
                            setRecordInvoicePaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Outstanding Payables */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Top Outstanding Payables (Vendor Bills)
                </h3>
                <button
                  onClick={() => setActiveTab('payables')}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  View All
                </button>
              </div>

              {payables.filter(p => (p.balanceDue || 0) > 0).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No outstanding vendor bills.</p>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {payables.filter(p => (p.balanceDue || 0) > 0).slice(0, 5).map(pay => (
                    <div key={pay.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{pay.vendor} • #{pay.billNumber}</p>
                        <p className="text-gray-400 mt-0.5">Due: {pay.dueDate}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <span className="font-bold text-amber-600 block">
                            ${Number(pay.balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(pay.status)}`}>
                            {pay.status}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setPayableToPay(pay);
                            setRecordPayableModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] transition-colors"
                        >
                          Pay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INCOME MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'income' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search income by ID, client, description, or reference..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {['All', 'Received', 'Pending', 'Cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {s}
                </button>
              ))}

              <button
                onClick={() => exportToCSV(incomes, 'MAGDIO_Income_Report')}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Income Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {incomes.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-sm">
                No income records found. Click "Add Income" to record your first entry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      <th className="py-3.5 px-6">Income ID</th>
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-6">Client</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6">Method / Ref</th>
                      <th className="py-3.5 px-6">Amount</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {incomes
                      .filter(inc => {
                        if (statusFilter !== 'All' && inc.status !== statusFilter) return false;
                        if (searchTerm.trim()) {
                          const q = searchTerm.toLowerCase();
                          return (
                            inc.incomeId?.toLowerCase().includes(q) ||
                            inc.clientName?.toLowerCase().includes(q) ||
                            inc.description?.toLowerCase().includes(q) ||
                            inc.transactionReference?.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((inc) => (
                        <tr key={inc.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-emerald-700">{inc.incomeId}</td>
                          <td className="py-4 px-6 font-mono text-gray-600">{inc.date}</td>
                          <td className="py-4 px-6 font-bold text-gray-900">{inc.clientName || 'Direct'}</td>
                          <td className="py-4 px-6 text-gray-700 max-w-xs truncate">{inc.description}</td>
                          <td className="py-4 px-6">
                            <span className="font-medium text-gray-800 block">{inc.paymentMethod}</span>
                            <span className="text-[10px] font-mono text-gray-400">{inc.transactionReference || '-'}</span>
                          </td>
                          <td className="py-4 px-6 font-black text-sm text-emerald-700">
                            ${Number(inc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(inc.status)}`}>
                              {inc.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingIncome(inc);
                                  setIncomeModalOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete({ collection: 'income', id: inc.id, name: `Income #${inc.incomeId}` });
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXPENSE MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses by ID, vendor, description, or category..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {['All', 'Paid', 'Pending', 'Cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === s ? 'bg-rose-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {s}
                </button>
              ))}

              <button
                onClick={() => exportToCSV(expenses, 'MAGDIO_Expense_Report')}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-sm">
                No expense records found. Click "Add Expense" to log your first company cost.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      <th className="py-3.5 px-6">Expense ID</th>
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Vendor</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6">Amount</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {expenses
                      .filter(exp => {
                        if (statusFilter !== 'All' && exp.status !== statusFilter) return false;
                        if (searchTerm.trim()) {
                          const q = searchTerm.toLowerCase();
                          return (
                            exp.expenseId?.toLowerCase().includes(q) ||
                            exp.vendor?.toLowerCase().includes(q) ||
                            exp.category?.toLowerCase().includes(q) ||
                            exp.description?.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((exp) => (
                        <tr key={exp.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-rose-700">{exp.expenseId}</td>
                          <td className="py-4 px-6 font-mono text-gray-600">{exp.date}</td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold rounded-md text-[11px]">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-gray-900">{exp.vendor}</td>
                          <td className="py-4 px-6 text-gray-700 max-w-xs truncate">{exp.description}</td>
                          <td className="py-4 px-6 font-black text-sm text-rose-700">
                            ${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(exp.status)}`}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setExpenseModalOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete({ collection: 'expenses', id: exp.id, name: `Expense #${exp.expenseId}` });
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ACCOUNTS RECEIVABLE TAB (INTEGRATED WITH INVOICES) */}
      {/* ========================================================================= */}
      {activeTab === 'receivables' && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Accounts Receivable Ledger
              </span>
              <h2 className="text-2xl font-black mt-0.5">
                ${summaryStats.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })} Outstanding
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                Directly connected with the Invoice Management module. Payments recorded here automatically sync.
              </p>
            </div>

            <button
              onClick={() => exportToCSV(invoices, 'MAGDIO_Receivables_Report')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Export Receivables CSV
            </button>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    <th className="py-3.5 px-6">Invoice #</th>
                    <th className="py-3.5 px-6">Client / Company</th>
                    <th className="py-3.5 px-6">Issue Date</th>
                    <th className="py-3.5 px-6">Due Date</th>
                    <th className="py-3.5 px-6">Total Amount</th>
                    <th className="py-3.5 px-6">Paid Amount</th>
                    <th className="py-3.5 px-6">Balance Due</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Collect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {invoices.map((inv) => {
                    const balance = Number(inv.balanceDue ?? (inv.totalAmount - (inv.amountPaid || 0)));
                    return (
                      <tr key={inv.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-blue-600">#{inv.invoiceNumber}</td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900">{inv.clientCompany}</div>
                          <div className="text-[11px] text-gray-400">{inv.clientName}</div>
                        </td>
                        <td className="py-4 px-6 font-mono text-gray-600">{inv.issueDate}</td>
                        <td className="py-4 px-6 font-mono text-gray-600">{inv.dueDate}</td>
                        <td className="py-4 px-6 font-bold text-gray-900">
                          ${Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 font-semibold text-emerald-700">
                          ${Number(inv.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-black text-sm ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {balance > 0 && inv.status !== 'Cancelled' ? (
                            <button
                              onClick={() => {
                                setInvoiceToPay(inv);
                                setRecordInvoicePaymentModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1 ml-auto transition-all"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Record Payment
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-xs flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Cleared
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ACCOUNTS PAYABLE TAB (VENDOR BILLS) */}
      {/* ========================================================================= */}
      {activeTab === 'payables' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="p-6 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Accounts Payable Ledger (Vendor Liabilities)
              </span>
              <h2 className="text-2xl font-black mt-0.5">
                ${summaryStats.totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })} Owed
              </h2>
              <p className="text-xs text-amber-100 mt-1">
                Track supplier invoices, contractor payments, utilities, and infrastructure bills.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingPayable(null);
                  setPayableModalOpen(true);
                }}
                className="px-4 py-2 bg-white text-amber-900 rounded-xl text-xs font-bold shadow transition-all hover:bg-amber-50"
              >
                <Plus className="w-4 h-4 inline mr-1" /> Add Vendor Bill
              </button>

              <button
                onClick={() => exportToCSV(payables, 'MAGDIO_Payables_Report')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Payables Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {payables.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-sm">
                No vendor bills found. Click "Add Vendor Bill" to log a liability.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      <th className="py-3.5 px-6">Bill #</th>
                      <th className="py-3.5 px-6">Vendor</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6">Due Date</th>
                      <th className="py-3.5 px-6">Bill Amount</th>
                      <th className="py-3.5 px-6">Paid Amount</th>
                      <th className="py-3.5 px-6">Balance Owed</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {payables.map((p) => {
                      const balance = Number(p.balanceDue ?? (p.amount - (p.amountPaid || 0)));
                      return (
                        <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-amber-700">#{p.billNumber}</td>
                          <td className="py-4 px-6 font-bold text-gray-900">{p.vendor}</td>
                          <td className="py-4 px-6 text-gray-700 max-w-xs truncate">{p.description}</td>
                          <td className="py-4 px-6 font-mono text-gray-600">{p.dueDate}</td>
                          <td className="py-4 px-6 font-bold text-gray-900">
                            ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 font-semibold text-emerald-700">
                            ${Number(p.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`font-black text-sm ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {balance > 0 && p.status !== 'Cancelled' && (
                                <button
                                  onClick={() => {
                                    setPayableToPay(p);
                                    setRecordPayableModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors"
                                >
                                  Pay Bill
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingPayable(p);
                                  setPayableModalOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete({ collection: 'payables', id: p.id, name: `Vendor Bill #${p.billNumber}` });
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. UNIFIED TRANSACTIONS CASHBOOK */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions across party, description, ref #, or ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {['All', 'Income', 'Expense'].map(type => (
                <button
                  key={type}
                  onClick={() => setCategoryFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    categoryFilter === type ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {type}
                </button>
              ))}

              <button
                onClick={() => exportToCSV(allTransactions, 'MAGDIO_Transactions_Cashbook')}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export Cashbook CSV
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-sm">
                No financial transactions match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      <th className="py-3.5 px-6">Transaction ID</th>
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-6">Type</th>
                      <th className="py-3.5 px-6">Party / Client / Vendor</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6">Method / Ref</th>
                      <th className="py-3.5 px-6">Amount</th>
                      <th className="py-3.5 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-gray-900">{tx.code}</td>
                        <td className="py-4 px-6 font-mono text-gray-600">{tx.date}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                            tx.type === 'Income'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-900">{tx.party}</td>
                        <td className="py-4 px-6 text-gray-700 max-w-xs truncate">{tx.description}</td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-800 block">{tx.method}</span>
                          <span className="text-[10px] font-mono text-gray-400">{tx.reference}</span>
                        </td>
                        <td className="py-4 px-6 font-black text-sm">
                          <span className={tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {tx.amount >= 0 ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. FINANCIAL REPORTS & PROFIT & LOSS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Selector & Date Controls */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'pnl', label: 'Profit & Loss Statement' },
                { id: 'income', label: 'Income Report' },
                { id: 'expense', label: 'Expense Breakdown' },
                { id: 'receivables', label: 'Receivables Aging' },
                { id: 'payables', label: 'Payables Aging' }
              ].map(rep => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedReport === rep.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {rep.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* Selected Report Content */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8 print:p-0 print:border-none print:shadow-none">
            {/* Header branding for print */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="MAGDIO" className="h-9 object-contain p-1.5 bg-[#0b0e1b] rounded-xl shadow-sm" />
                  <h2 className="text-xl font-black text-gray-900">MAGDIO Financial Systems</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">Official Accounting & Performance Statement</p>
              </div>
              <div className="text-right text-xs text-gray-500 font-mono">
                <p>Generated: {new Date().toLocaleDateString()}</p>
                <p>Scope: Full Financial Period</p>
              </div>
            </div>

            {/* 1. Profit & Loss View */}
            {selectedReport === 'pnl' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Profit & Loss Summary (P&L)</h3>
                
                <div className="space-y-3 divide-y divide-gray-100 text-sm">
                  <div className="flex justify-between py-2 font-medium text-emerald-800">
                    <span>Gross Operating Revenue (Total Income)</span>
                    <span className="font-bold">${summaryStats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between py-2 font-medium text-rose-800">
                    <span>Total Operating Expenses</span>
                    <span className="font-bold">-${summaryStats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between py-4 text-base font-black border-t-2 border-gray-900">
                    <span>Net Operating Profit / (Loss)</span>
                    <span className={summaryStats.netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}>
                      ${summaryStats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-xs text-gray-500">
                    <span>Net Profit Margin</span>
                    <span className="font-bold text-gray-900">
                      {summaryStats.totalIncome > 0 ? ((summaryStats.netProfit / summaryStats.totalIncome) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/70 text-xs text-gray-600 space-y-1">
                  <p className="font-bold text-gray-900">Notes on Profit & Loss Calculation:</p>
                  <p>• Revenue is aggregated from all verified customer payments and direct income records.</p>
                  <p>• Expenses cover team salaries, software subscriptions, office overhead, and equipment.</p>
                </div>
              </div>
            )}

            {/* 2. Income Report View */}
            {selectedReport === 'income' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Detailed Income Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Client</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {incomes.map(inc => (
                        <tr key={inc.id}>
                          <td className="py-2.5 px-3 font-mono">{inc.date}</td>
                          <td className="py-2.5 px-3 font-medium">{inc.clientName || 'Direct'}</td>
                          <td className="py-2.5 px-3">{inc.description}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            ${Number(inc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Expense Report View */}
            {selectedReport === 'expense' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Detailed Operating Expense Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Vendor</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenses.map(exp => (
                        <tr key={exp.id}>
                          <td className="py-2.5 px-3 font-mono">{exp.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-700">{exp.category}</td>
                          <td className="py-2.5 px-3 font-medium">{exp.vendor}</td>
                          <td className="py-2.5 px-3">{exp.description}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                            ${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Receivables Aging View */}
            {selectedReport === 'receivables' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Accounts Receivable Aging Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Client</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Invoice Total</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.filter(i => (i.balanceDue || 0) > 0).map(inv => (
                        <tr key={inv.id}>
                          <td className="py-2.5 px-3 font-mono font-bold">#{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-medium">{inv.clientCompany}</td>
                          <td className="py-2.5 px-3 font-mono">{inv.dueDate}</td>
                          <td className="py-2.5 px-3">${Number(inv.totalAmount).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            ${Number(inv.balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Payables Aging View */}
            {selectedReport === 'payables' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Accounts Payable Aging Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Vendor</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Bill Total</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payables.filter(p => (p.balanceDue || 0) > 0).map(pay => (
                        <tr key={pay.id}>
                          <td className="py-2.5 px-3 font-mono font-bold">#{pay.billNumber}</td>
                          <td className="py-2.5 px-3 font-medium">{pay.vendor}</td>
                          <td className="py-2.5 px-3 font-mono">{pay.dueDate}</td>
                          <td className="py-2.5 px-3">${Number(pay.amount).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                            ${Number(pay.balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL MODALS INTEGRATION */}
      {/* ========================================================================= */}
      {incomeModalOpen && (
        <IncomeModal
          isOpen={incomeModalOpen}
          onClose={() => {
            setIncomeModalOpen(false);
            setEditingIncome(null);
          }}
          onSuccess={fetchAllAccountsData}
          editingIncome={editingIncome}
          clients={clients}
          invoices={invoices}
        />
      )}

      {expenseModalOpen && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSuccess={fetchAllAccountsData}
          editingExpense={editingExpense}
        />
      )}

      {payableModalOpen && (
        <PayableModal
          isOpen={payableModalOpen}
          onClose={() => {
            setPayableModalOpen(false);
            setEditingPayable(null);
          }}
          onSuccess={fetchAllAccountsData}
          editingPayable={editingPayable}
        />
      )}

      {recordPayableModalOpen && payableToPay && (
        <RecordPayablePaymentModal
          isOpen={recordPayableModalOpen}
          onClose={() => {
            setRecordPayableModalOpen(false);
            setPayableToPay(null);
          }}
          onSuccess={fetchAllAccountsData}
          payable={payableToPay}
        />
      )}

      {recordInvoicePaymentModalOpen && invoiceToPay && (
        <RecordPaymentModal
          isOpen={recordInvoicePaymentModalOpen}
          onClose={() => {
            setRecordInvoicePaymentModalOpen(false);
            setInvoiceToPay(null);
          }}
          onSuccess={fetchAllAccountsData}
          invoice={invoiceToPay}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.name || 'this record'}
      />
    </div>
  );
}
