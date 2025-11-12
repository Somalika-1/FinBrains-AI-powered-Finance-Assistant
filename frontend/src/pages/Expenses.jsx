import React, { useEffect, useMemo, useState } from 'react';
import { getCategories, getExpenses, updateExpense, deleteExpense, createCategory, deleteCategory } from '../api';
import dayjs from 'dayjs';

export default function Expenses() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ categoryId: '', paymentType: '', month: dayjs().format('YYYY-MM') });
  const [showAdd, setShowAdd] = useState(false);
  const [newExp, setNewExp] = useState({ categoryId: '', amount: '', paymentType: '', date: dayjs().format('YYYY-MM-DD'), description: '' });
  const [editExp, setEditExp] = useState(null); // { id, categoryId }

  const loadData = async () => {
    try {
      const [{ data: catsRes }, { data: expsRes }] = await Promise.all([
        getCategories(),
        getExpenses(),
      ]);
      const catsList = Array.isArray(catsRes) ? catsRes : (catsRes?.data || catsRes?.categories);
      const expsList = Array.isArray(expsRes) ? expsRes : expsRes?.data;
      setCategories(Array.isArray(catsList) ? catsList : []);
      setItems(Array.isArray(expsList) ? expsList : []);
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryOptions = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return list.map(c => ({ id: c.id || c._id || c.value || c.name, name: c.name || c.label || c.id || c._id }));
  }, [categories]);

  const filtered = useMemo(() => {
    const src = Array.isArray(items) ? items : [];
    return src.filter((e) => {
      const catId = e.category?.id || e.category?._id || e.categoryId;
      if (filters.categoryId && catId !== filters.categoryId) return false;

      // Normalize payment method/type across possible keys from backend
      const payType = e.paymentMethod?.type || e.paymentType || e.modeOfPayment || e.payment_mode;
      if (filters.paymentType && payType !== filters.paymentType) return false;

      // Month filter
      const d = dayjs(e.date);
      if (filters.month && d.isValid() && d.format('YYYY-MM') !== filters.month) return false;

      return true;
    });
  }, [items, filters]);

  const totalFiltered = useMemo(() => {
    return (Array.isArray(filtered) ? filtered : []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Expenses</h2>
          <p className="text-sm text-gray-600">Manage and filter your spending</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="p-2 rounded-md border border-gray-200 bg-white shadow-sm" value={filters.month} onChange={(e)=>setFilters({...filters, month:e.target.value})}>
            {Array.from({length:12}).map((_,i)=>{
              const m = dayjs().subtract(i,'month').format('YYYY-MM');
              return <option key={m} value={m}>{dayjs(m+"-01").format('MMM YYYY')}</option>
            })}
          </select>
          <select className="p-2 rounded-md border border-gray-200 bg-white shadow-sm" value={filters.categoryId} onChange={(e)=>setFilters({...filters, categoryId:e.target.value})}>
            <option value="">All categories</option>
            {categoryOptions.map((c)=> (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="p-2 rounded-md border border-gray-200 bg-white shadow-sm" value={filters.paymentType} onChange={(e)=>setFilters({...filters, paymentType:e.target.value})}>
            <option value="">All payments</option>
            <option>Cash</option>
            <option>Card</option>
            <option>UPI</option>
            <option>Net Banking</option>
          </select>
          <button onClick={()=>setShowAdd(true)} className="ml-auto px-4 py-2 rounded-md bg-black text-white shadow hover:bg-black/90">Add Expense</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Total (filtered)</div>
          <div className="text-2xl font-semibold">₹{totalFiltered.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Transactions</div>
          <div className="text-2xl font-semibold">{filtered.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow border border-gray-100">
          <div className="text-sm text-gray-600">Avg / Txn</div>
          <div className="text-2xl font-semibold">₹{(totalFiltered / (filtered.length || 1)).toFixed(2)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow">
        <table className="min-w-full">
          <thead className="text-left text-sm text-gray-600">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Amount</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id || e._id} className="border-t border-gray-100">
                <td className="p-3">{dayjs(e.date).isValid() ? dayjs(e.date).format('YYYY-MM-DD') : ''}</td>
                <td className="p-3">{e.category?.name || e.category || e.categoryId}</td>
                <td className="p-3">{e.description}</td>
                <td className="p-3">{e.paymentMethod?.type || e.paymentType || e.modeOfPayment || e.payment_mode || '—'}</td>
                <td className="p-3">₹{Number(e.amount).toFixed(2)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button className="px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50" onClick={()=> setEditExp({ id: e.id || e._id, categoryId: e.category?.id || e.category?._id || e.categoryId })}>Edit</button>
                    <button className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700" onClick={async ()=>{
                      if (!window.confirm('Are you sure you want to delete this expense?')) return;
                      try { await deleteExpense(e.id || e._id); await loadData(); } catch {}
                    }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Category management moved to /categories */}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-lg p-6 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Expense</h3>
              <button className="text-gray-500 hover:text-black" onClick={()=>setShowAdd(false)}>✕</button>
            </div>
            <div className="space-y-3">
              <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.categoryId} onChange={(e)=>setNewExp({...newExp, categoryId:e.target.value})}>
                <option value="">Select category</option>
                {categoryOptions.map(c=> (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input type="number" placeholder="Amount" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.amount} onChange={(e)=>setNewExp({...newExp, amount:e.target.value})} />
              <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.paymentType} onChange={(e)=>setNewExp({...newExp, paymentType:e.target.value})}>
                <option value="">Payment method</option>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Net Banking</option>
              </select>
              <input type="date" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.date} onChange={(e)=>setNewExp({...newExp, date:e.target.value})} />
              <input type="text" placeholder="Description" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.description} onChange={(e)=>setNewExp({...newExp, description:e.target.value})} />
              <div className="pt-2 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-200 bg-white" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-black text-white" onClick={async ()=>{
                  try {
                    const payload = {
                      categoryId: newExp.categoryId,
                      amount: Number(newExp.amount),
                      description: newExp.description,
                      paymentType: newExp.paymentType,
                      date: `${newExp.date}T00:00:00`,
                    };
                    const { addExpense } = await import('../api');
                    await addExpense(payload);
                    setShowAdd(false);
                    setNewExp({ categoryId: '', amount: '', paymentType: '', date: dayjs().format('YYYY-MM-DD'), description: '' });
                    await loadData();
                  } catch (e) {}
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setEditExp(null)} />
          <div className="relative z-10 w-full max-w-md p-6 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Expense</h3>
              <button className="text-gray-500 hover:text-black" onClick={()=>setEditExp(null)}>✕</button>
            </div>
            <div className="space-y-3">
              <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={editExp.categoryId} onChange={(e)=>setEditExp({...editExp, categoryId:e.target.value})}>
                {categoryOptions.map(c=> (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="pt-2 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-200 bg-white" onClick={()=>setEditExp(null)}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-black text-white" onClick={async ()=>{
                  try { await updateExpense(editExp.id, { categoryId: editExp.categoryId }); setEditExp(null); await loadData(); } catch {}
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
