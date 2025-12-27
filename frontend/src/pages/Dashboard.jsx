import React, { useEffect, useState } from 'react';
import { getExpenses, getBudgetHistory, getBudgetBreakdown, getFinanceInsights } from '../api';
import api from '../api/axios';
// Charts: Recharts (require install)
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import dayjs from 'dayjs';
import BudgetCard from '../components/BudgetCard';

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  // Month selection (default to current month)
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getExpenses();
        const list = Array.isArray(data) ? data : data?.data;
        const safeList = Array.isArray(list) ? list : [];
        // Filter to selected month on the client side for dashboard metrics
        const filtered = safeList.filter((e) => {
          const d = dayjs(e.date);
          return d.isValid() && d.format('YYYY-MM') === month;
        });
        setExpenses(filtered);
        const sum = filtered.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        setTotal(sum);
      } catch (e) {}
      finally { setReady(true); }
    })();
  }, [month]);

  // Budget history (last 6 months) and category breakdown (current month)
  const [history, setHistory] = useState([]);
  const [breakdown, setBreakdown] = useState({ total: 0, items: [] });
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const curMonth = month; // selected month
  const fromMonth = dayjs(month + '-01').subtract(5, 'month').format('YYYY-MM');

  useEffect(() => {
    (async () => {
      try {
        const h = await getBudgetHistory(fromMonth, curMonth);
        const hData = h?.data?.data || h?.data || [];
        setHistory(Array.isArray(hData) ? hData : []);
      } catch {}
      try {
        const b = await getBudgetBreakdown(curMonth);
        const bData = b?.data?.data || b?.data || { total: 0, items: [] };
        setBreakdown(bData);
      } catch {}
      try {
        const mi = await api.get('/api/expenses/monthly-income', { params: { month: curMonth } });
        const inc = mi?.data?.data?.income ?? mi?.data?.income ?? 0;
        setMonthlyIncome(Number(inc) || 0);
      } catch {}
    })();
  }, [fromMonth, curMonth, total]);

  // Insights: build minimal payload from current month breakdown and call insights API
  useEffect(() => {
    const run = async () => {
      setInsightsError('');
      if (!breakdown || !Array.isArray(breakdown.items)) return;
      try {
        setInsightsLoading(true);
        // Build expensesByCategory from breakdown items: [{category, amount}]
        const byCat = {};
        for (const it of breakdown.items) {
          const name = it.category || it.name || 'Other';
          const amt = Number(it.amount || it.total || 0);
          byCat[name] = (byCat[name] || 0) + (isNaN(amt) ? 0 : amt);
        }
        // Compute expense trend vs last month from history
        let expenseTrendPct;
        try {
          const prevKey = dayjs(curMonth + '-01').subtract(1, 'month').format('YYYY-MM');
          const curSpent = Number(breakdown.total || 0);
          const prev = (Array.isArray(history) ? history : []).find(h => (h.monthKey || h.month) === prevKey);
          const prevSpent = Number(prev?.spent || 0);
          if (prevSpent > 0) {
            expenseTrendPct = ((curSpent - prevSpent) / prevSpent) * 100.0;
          }
        } catch {}
        const payload = {
          monthlyIncome: Number(monthlyIncome) || 0,
          monthlyExpensesByCategory: byCat,
          monthlySavings: 0,
          investments: [],
          liabilities: [],
          goals: { shortTerm: [], longTerm: [] },
          emergencyFundBalance: 0,
          ...(Number.isFinite(expenseTrendPct) ? { expenseTrendPct } : {}),
        };
        const res = await getFinanceInsights(payload);
        const data = res?.data || {};
        setInsights({
          summary: data.summary,
          insights: Array.isArray(data.insights) ? data.insights : [],
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          closing: data.closing,
          impactScore: data.impactScore,
        });
      } catch (e) {
        setInsightsError('Unable to fetch insights');
      } finally {
        setInsightsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdown.total, breakdown.items?.length, monthlyIncome]);

  // Monthly trend aggregation
  const monthlyTrend = (() => {
    const map = new Map();
    for (const e of (Array.isArray(history) ? history : [])) {
      const key = e.monthKey || e.month;
      const amt = Number(e.spent || 0);
      if (!key) continue;
      map.set(key, Number(amt));
    }
    const arr = Array.from(map.entries())
      .sort((a,b) => (a[0] < b[0] ? -1 : 1))
      .map(([ym, amt]) => ({ month: dayjs(ym + '-01').format('MMM YYYY'), amount: Number(amt) }));
    return arr;
  })();

  // Top 3 categories by total
  const topCategories = (() => {
    const map = new Map();
    for (const e of (Array.isArray(expenses) ? expenses : [])) {
      const name = e.category?.name || e.category || e.categoryId || 'Uncategorized';
      map.set(name, (map.get(name) || 0) + (Number(e.amount) || 0));
    }
    return Array.from(map.entries())
      .map(([name, amt]) => ({ name, amount: Number(amt) }))
      .sort((a,b) => b.amount - a.amount)
      .slice(0, 3);
  })();

  // Recent 5 expenses
  const recent = (() => {
    return (Array.isArray(expenses) ? expenses : [])
      .slice()
      .sort((a,b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .slice(0,5);
  })();

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-700">Month</label>
        <input
          type="month"
          value={month}
          onChange={(e)=>setMonth(e.target.value)}
          className="p-2 border rounded"
        />
      </div>

      <BudgetCard month={month} refreshKey={expenses.length + Number(total || 0)} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Total Spent ({dayjs(month+'-01').format('MMM YYYY')})</div>
          <div className="text-2xl font-semibold">₹{total.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Transactions ({dayjs(month+'-01').format('MMM YYYY')})</div>
          <div className="text-2xl font-semibold">{expenses.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Avg / Txn ({dayjs(month+'-01').format('MMM YYYY')})</div>
          <div className="text-2xl font-semibold">₹{(total / (expenses.length || 1)).toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="mb-2 font-semibold">Monthly Trend</div>
          {!ready ? (
            <div className="h-72 flex items-center justify-center text-gray-500">Loading...</div>
          ) : monthlyTrend.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-500">No data</div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6767" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#FF6767" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="#FF6767" fillOpacity={1} fill="url(#colorAmt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="mb-2 font-semibold">Personalized Insights</div>
          {insightsLoading ? (
            <div className="h-24 flex items-center justify-center text-gray-500">Generating...</div>
          ) : insightsError ? (
            <div className="text-red-600 text-sm">{insightsError}</div>
          ) : !insights ? (
            <div className="text-gray-500 text-sm">No insights yet</div>
          ) : (
            <div className="space-y-3">
              {insights.summary && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Summary</div>
                  <div className="text-gray-900">{insights.summary}</div>
                </div>
              )}
              {Array.isArray(insights.insights) && insights.insights.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Key Insights</div>
                  <ul className="list-disc ml-5 text-gray-900">
                    {insights.insights.map((it, idx) => (<li key={idx}>{it}</li>))}
                  </ul>
                </div>
              )}
              {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Recommendations</div>
                  <ol className="list-decimal ml-5 text-gray-900">
                    {insights.recommendations.map((it, idx) => (<li key={idx}>{it}</li>))}
                  </ol>
                </div>
              )}
              {insights.closing && (
                <div className="text-gray-700 italic">{insights.closing}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
        <div className="mb-2 font-semibold">Spent vs Budget (Last 6 months)</div>
        {history.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500">No data</div>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.map(h=>({
                month: dayjs(h.monthKey+"-01").format('MMM YY'),
                budget: Number(h.budget||0),
                spent: Number(h.spent||0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="budget" stroke="#42A5F5" />
                <Line type="monotone" dataKey="spent" stroke="#FF6767" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
        <div className="mb-2 font-semibold">Recent Expenses</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Category</th>
                <th className="p-2">Description</th>
                <th className="p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id || e._id} className="border-t border-gray-100">
                  <td className="p-2">{dayjs(e.date).isValid() ? dayjs(e.date).format('YYYY-MM-DD') : ''}</td>
                  <td className="p-2">{e.category?.name || e.category || e.categoryId}</td>
                  <td className="p-2">{e.description}</td>
                  <td className="p-2 font-semibold">₹{Number(e.amount).toFixed(2)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan="4" className="p-3 text-center text-gray-500">No recent activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
