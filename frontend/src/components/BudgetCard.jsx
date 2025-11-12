import React, { useEffect, useMemo, useState } from 'react';
import { getBudgetStatus, setBudget } from '../api';
import dayjs from 'dayjs';

export default function BudgetCard({ month = dayjs().format('YYYY-MM'), refreshKey = 0 }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [overToast, setOverToast] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await getBudgetStatus(month);
      const s = data?.data || data;
      setStatus(s || null);
      if (s && typeof s.budget === 'number') setAmount(String(s.budget));
      if (s && s.percentage > 100 && !overToast) {
        setOverToast(`You have exceeded your monthly budget by ₹${(Number(s.spent||0) - Number(s.budget||0)).toFixed(2)}!`);
        setTimeout(()=>setOverToast(''), 3500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); /* eslint-disable-next-line */ }, [month, refreshKey]);

  const pct = useMemo(() => {
    const p = Number(status?.percentage || 0);
    return Number.isFinite(p) ? Math.max(0, p) : 0;
  }, [status]);

  const barColor = pct <= 70 ? 'bg-green-500' : pct <= 100 ? 'bg-orange-500' : 'bg-red-600';

  return (
    <div className="p-4 rounded-xl bg-white shadow border border-gray-100 relative overflow-hidden">
      {overToast && (
        <div className="absolute top-2 right-2 z-10 px-3 py-2 rounded-md bg-red-600 text-white text-sm shadow">{overToast}</div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm text-gray-600">Monthly Budget</div>
          <div className="text-lg font-semibold">{status?.month || dayjs(month+"-01").format('MMM YYYY')}</div>
        </div>
        <div className="flex items-center gap-3">
          <img src="/images/budget_illustration.png" alt="budget" className="hidden sm:block w-12 h-12 rounded-lg object-cover shadow" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <button className="px-3 py-1.5 rounded-md bg-black text-white hover:bg-black/90" onClick={()=>setEditOpen(true)}>Edit Budget</button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm mb-2">
            <div>Budget: <span className="font-semibold">₹{Number(status?.budget || 0).toFixed(2)}</span></div>
            <div>Spent: <span className="font-semibold">₹{Number(status?.spent || 0).toFixed(2)}</span></div>
            <div>Remaining: <span className="font-semibold">₹{Number(status?.remaining || 0).toFixed(2)}</span></div>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-3 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="mt-1 text-right text-sm text-gray-700">{pct.toFixed(0)}%</div>
          {pct > 100 && (
            <div className="mt-2 text-sm text-red-700">You have exceeded your monthly budget by ₹{(Number(status?.spent||0) - Number(status?.budget||0)).toFixed(2)}!</div>
          )}
        </>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setEditOpen(false)} />
          <div className="relative z-10 w-full max-w-md p-6 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Set Monthly Budget</h3>
              <button className="text-gray-500 hover:text-black" onClick={()=>setEditOpen(false)}>✕</button>
            </div>
            <div className="space-y-3">
              <input type="number" className="w-full p-3 rounded-md border border-gray-200" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount (₹)" />
              <div className="pt-2 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-200 bg-white" onClick={()=>setEditOpen(false)}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-black text-white" onClick={async ()=>{
                  const val = Number(amount);
                  if (!Number.isFinite(val) || val < 0) return;
                  await setBudget(val);
                  setEditOpen(false);
                  await fetchStatus();
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
