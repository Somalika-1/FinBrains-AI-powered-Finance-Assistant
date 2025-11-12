import React, { useEffect, useState } from 'react';
import { getBudgetStatus, setBudget, getBudgetBreakdown, getBudgetHistory } from '../api';
import BudgetCard from '../components/BudgetCard';
import dayjs from 'dayjs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';

export default function Budget() {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [status, setStatus] = useState(null);
  const [breakdown, setBreakdown] = useState({ total: 0, items: [] });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getBudgetStatus(month);
        const s = data?.data || data;
        setStatus(s || null);
        if (s && typeof s.budget === 'number') setAmount(String(s.budget));
      } catch {}
      try {
        const br = await getBudgetBreakdown(month);
        const brData = br?.data?.data || br?.data || { total: 0, items: [] };
        setBreakdown(brData);
      } catch {}
      try {
        const from = dayjs(month + '-01').subtract(5, 'month').format('YYYY-MM');
        const hi = await getBudgetHistory(from, month);
        const hData = hi?.data?.data || hi?.data || [];
        setHistory(Array.isArray(hData) ? hData : []);
      } catch {}
    })();
  }, [month, refreshKey]);

  const onSave = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val < 0) return;
    setSaving(true);
    try {
      await setBudget(val);
      setToast('Budget saved successfully');
      setRefreshKey((k) => k + 1);
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setToast('Failed to save budget');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-3 rounded-md bg-green-100 text-green-800 border border-green-200">{toast}</div>
      )}

      {/* Header: Month selector + quick presets */}
      <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Budget</h2>
            <select className="p-2 rounded-md border border-gray-200" value={month} onChange={(e)=>setMonth(e.target.value)}>
              {Array.from({length:12}).map((_,i)=>{
                const m = dayjs().subtract(i,'month').format('YYYY-MM');
                return <option key={m} value={m}>{dayjs(m+"-01").format('MMM YYYY')}</option>
              })}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-md border" onClick={()=>{setAmount('5000');}}>₹5,000</button>
            <button className="px-3 py-1.5 rounded-md border" onClick={()=>{setAmount('10000');}}>₹10,000</button>
            <button className="px-3 py-1.5 rounded-md border" onClick={()=>{setAmount('20000');}}>₹20,000</button>
            <div className="flex items-center gap-2">
              <input type="number" className="p-2 rounded-md border border-gray-200 w-36" placeholder="Amount (₹)" value={amount} onChange={(e)=>setAmount(e.target.value)} />
              <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-md bg-black text-white hover:bg-black/90 disabled:opacity-60">{saving? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Budget status card */}
      <BudgetCard month={month} refreshKey={refreshKey} />

      {/* Charts: breakdown + history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="mb-2 font-semibold">Category Breakdown ({dayjs(month+"-01").format('MMM YYYY')})</div>
          {(!breakdown.items || breakdown.items.length === 0) ? (
            <div className="h-40 flex items-center justify-center text-gray-500">No data</div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown.items} dataKey="amount" nameKey="name" outerRadius={90} label>
                    {breakdown.items.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#FF6767","#FFA500","#66BB6A","#42A5F5","#AB47BC","#FF7043"][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="mb-2 font-semibold">Spent vs Budget (Last 6 months)</div>
          {history.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">No data</div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history.map(h=>({ month: dayjs(h.monthKey+"-01").format('MMM YY'), budget: Number(h.budget||0), spent: Number(h.spent||0) }))}>
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
      </div>
    </div>
  );
}
