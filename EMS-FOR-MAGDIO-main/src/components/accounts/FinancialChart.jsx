import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart as PieIcon, BarChart3 } from 'lucide-react';

export default function FinancialChart({
  incomes = [],
  expenses = [],
  invoices = []
}) {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'category'
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Month labels
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Aggregate monthly data for selected year
  const monthlyData = useMemo(() => {
    const data = months.map((month, idx) => {
      const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      
      // Income for month: direct income + invoice payments
      let incomeSum = 0;
      incomes.forEach(inc => {
        if (inc.date && inc.date.startsWith(monthPrefix) && inc.status !== 'Cancelled') {
          incomeSum += Number(inc.amount || 0);
        }
      });

      // Invoice payments recorded in this month
      invoices.forEach(inv => {
        if (Array.isArray(inv.payments)) {
          inv.payments.forEach(p => {
            if (p.date && p.date.startsWith(monthPrefix)) {
              // Only add if not already captured in direct income
              if (!incomes.some(inc => inc.transactionReference === p.reference && inc.amount === p.amount)) {
                incomeSum += Number(p.amount || 0);
              }
            }
          });
        }
      });

      // Expenses for month
      let expenseSum = 0;
      expenses.forEach(exp => {
        if (exp.date && exp.date.startsWith(monthPrefix) && exp.status !== 'Cancelled') {
          expenseSum += Number(exp.amount || 0);
        }
      });

      const netProfit = incomeSum - expenseSum;

      return {
        month,
        income: incomeSum,
        expense: expenseSum,
        netProfit: netProfit
      };
    });

    return data;
  }, [incomes, expenses, invoices, selectedYear]);

  // Aggregate expenses by category
  const categoryData = useMemo(() => {
    const catMap = {};
    expenses.forEach(exp => {
      if (exp.status !== 'Cancelled') {
        const cat = exp.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + Number(exp.amount || 0);
      }
    });

    const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: Math.round((amount / total) * 100)
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Find max value for chart scaling
  const maxBarValue = useMemo(() => {
    const max = Math.max(
      ...monthlyData.map(d => Math.max(d.income, d.expense)),
      1000
    );
    return max;
  }, [monthlyData]);

  const totalYearIncome = monthlyData.reduce((acc, d) => acc + d.income, 0);
  const totalYearExpense = monthlyData.reduce((acc, d) => acc + d.expense, 0);
  const totalYearProfit = totalYearIncome - totalYearExpense;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Financial Performance & Trends
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cashflow comparison, profit margins, and expense allocation for {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Toggle */}
          <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Cashflow (Monthly)
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'category'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Expense Categories
            </button>
          </div>

          {/* Year Picker */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Year Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Yearly Revenue</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            ${totalYearIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Yearly Operating Cost</span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            ${totalYearExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${totalYearProfit >= 0 ? 'bg-blue-50/70 border-blue-100 text-blue-800' : 'bg-amber-50/70 border-amber-100 text-amber-800'}`}>
          <span className="text-xs font-bold uppercase tracking-wider">
            {totalYearProfit >= 0 ? 'Net Operating Profit' : 'Net Operating Deficit'}
          </span>
          <p className="text-2xl font-black mt-1">
            ${totalYearProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Monthly Bar / Trend Chart View */}
      {viewMode === 'monthly' ? (
        <div className="space-y-4 pt-2">
          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-end gap-5 text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-500"></div>
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span>Net Profit</span>
            </div>
          </div>

          {/* Responsive SVG Bar Chart */}
          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[650px] h-64 flex items-end gap-4 sm:gap-6 pt-8 px-2 border-b border-gray-200">
              {monthlyData.map((d, idx) => {
                const incomeHeight = Math.max(4, Math.round((d.income / maxBarValue) * 180));
                const expenseHeight = Math.max(4, Math.round((d.expense / maxBarValue) * 180));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white text-[11px] font-medium py-1.5 px-2.5 rounded-xl shadow-xl z-20 whitespace-nowrap">
                      <p className="font-bold text-gray-200">{d.month} {selectedYear}</p>
                      <p className="text-emerald-400">Income: ${d.income.toLocaleString()}</p>
                      <p className="text-rose-400">Expense: ${d.expense.toLocaleString()}</p>
                      <p className={d.netProfit >= 0 ? 'text-blue-300 font-bold' : 'text-amber-300 font-bold'}>
                        Net: ${d.netProfit.toLocaleString()}
                      </p>
                    </div>

                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-48">
                      {/* Income Bar */}
                      <div
                        style={{ height: `${incomeHeight}px` }}
                        className="w-3 sm:w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all"
                      ></div>
                      {/* Expense Bar */}
                      <div
                        style={{ height: `${expenseHeight}px` }}
                        className="w-3 sm:w-4 bg-rose-500 hover:bg-rose-600 rounded-t-md transition-all"
                      ></div>
                    </div>

                    {/* Month Label */}
                    <span className="text-[11px] font-bold text-gray-500 mt-2">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Expense Categories Breakdown */
        <div className="space-y-4 pt-2">
          {categoryData.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No expense records found for categorization.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryData.map((cat, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-gray-900">{cat.name}</span>
                    <span className="text-gray-700">
                      ${cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs text-gray-400 font-normal ml-1">({cat.percentage}%)</span>
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
