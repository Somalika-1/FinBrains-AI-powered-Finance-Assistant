import React, { useEffect, useState } from 'react';
import { getExpenses, getBudgetHistory, getBudgetBreakdown } from '../api';
// Charts: Recharts (require install)
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import dayjs from 'dayjs';
import BudgetCard from '../components/BudgetCard';

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getExpenses();
        const list = Array.isArray(data) ? data : data?.data;
        const safeList = Array.isArray(list) ? list : [];
        setExpenses(safeList);
        const sum = safeList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        setTotal(sum);
      } catch (e) {}
      finally { setReady(true); }
    })();
  }, []);

  // Budget history (last 6 months) and category breakdown (current month)
  const [history, setHistory] = useState([]);
  const [breakdown, setBreakdown] = useState({ total: 0, items: [] });
  const curMonth = dayjs().format('YYYY-MM');
  const fromMonth = dayjs().subtract(5, 'month').format('YYYY-MM');

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
    })();
  }, [fromMonth, curMonth, expenses.length, total]);

  // Monthly trend aggregation
  const monthlyTrend = (() => {
    const map = new Map();
    for (const e of (Array.isArray(expenses) ? expenses : [])) {
      const d = dayjs(e.date);
      if (!d.isValid()) continue;
      const key = d.format('YYYY-MM');
      map.set(key, (map.get(key) || 0) + (Number(e.amount) || 0));
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
      <BudgetCard refreshKey={expenses.length + Number(total || 0)} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Total Spent</div>
          <div className="text-2xl font-semibold">₹{total.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Transactions</div>
          <div className="text-2xl font-semibold">{expenses.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Avg / Txn</div>
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
