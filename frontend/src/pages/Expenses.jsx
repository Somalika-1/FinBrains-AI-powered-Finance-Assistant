import React, { useEffect, useMemo, useState } from 'react';
import { getCategories, getExpenses, updateExpense, deleteExpense, createCategory, deleteCategory } from '../api';
import dayjs from 'dayjs';
import api from '../api/axios';
import axios from 'axios';

export default function Expenses() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ categoryId: '', paymentType: '', month: dayjs().format('YYYY-MM') });
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [newExp, setNewExp] = useState({
    categoryId: '',
    amount: '',
    type: 'EXPENSE',
    paymentType: '',
    date: dayjs().format('YYYY-MM-DD'),
    description: '',
    isRecurring: false,
    recurringFrequency: '',
    startDate: '',
    endDate: '',
  });
  const [editExp, setEditExp] = useState(null); // { id, categoryId }
  const [catKeywords, setCatKeywords] = useState([]); // dynamic keywords [{id,name,keywords}]
  const [editSuggestion, setEditSuggestion] = useState(null); // {name, confidence, reason}
  const [editCategoryTouched, setEditCategoryTouched] = useState(false);
  const [addSuggestion, setAddSuggestion] = useState(null); // suggestion for Add modal
  const [addCategoryTouched, setAddCategoryTouched] = useState(false);

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

  // Fetch dynamic category keywords once for suggestions
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/categories/keywords');
        const list = Array.isArray(data) ? data : (data?.data || []);
        setCatKeywords(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, []);

  // Debounced suggestion for edit modal (only when type is EXPENSE)
  useEffect(() => {
    setEditSuggestion(null);
    if (!editExp) return;
    const isExpense = (editExp.type || 'EXPENSE') === 'EXPENSE';
    const desc = (editExp.description || '').trim();
    if (!isExpense || desc.length < 3) return;
    const timer = setTimeout(async () => {
      try {
        const payload = {
          description: desc,
          amount: Number(editExp.amount || 0) || 0,
          categories: (Array.isArray(catKeywords) ? catKeywords : [])
            .filter(c => (c?.name || '').toLowerCase() !== 'monthly income')
            .map(c => ({ name: c.name, keywords: Array.isArray(c.keywords) ? c.keywords : [] })),
        };
        const baseURL = import.meta.env.VITE_INSIGHTS_API_URL || 'http://localhost:8000';
        // Debug log to verify effect is firing and what will be called
        console.log('AI categorize (edit) firing', { desc, baseURL, categoriesCount: payload.categories.length });
        const res = await axios.post(`${baseURL}/categorize-expense`, payload);
        const out = res?.data || {};
        if (out && out.predictedCategory && (out.confidence || 0) >= 0.5) {
          const nextSuggestion = { name: out.predictedCategory, confidence: out.confidence, reason: out.reason };
          setEditSuggestion(nextSuggestion);
          // Auto-apply to dropdown if user hasn't manually changed category in this edit session
          if (!editCategoryTouched && editExp) {
            const match = (Array.isArray(categories) ? categories : []).find(c => (c?.name || '') === nextSuggestion.name);
            if (match && (match.id || match._id)) {
              setEditExp({ ...editExp, categoryId: match.id || match._id });
            }
          }
        }
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [editExp?.description, editExp?.type, editExp?.amount, catKeywords]);

  // Debounced suggestion for Add modal (only when type is EXPENSE)
  useEffect(() => {
    setAddSuggestion(null);
    const isExpense = (newExp.type || 'EXPENSE') === 'EXPENSE';
    const desc = (newExp.description || '').trim();
    if (!isExpense || desc.length < 3) return;
    const timer = setTimeout(async () => {
      try {
        const payload = {
          description: desc,
          amount: Number(newExp.amount || 0) || 0,
          categories: (Array.isArray(catKeywords) ? catKeywords : [])
            .filter(c => (c?.name || '').toLowerCase() !== 'monthly income')
            .map(c => ({ name: c.name, keywords: Array.isArray(c.keywords) ? c.keywords : [] })),
        };
        const baseURL = import.meta.env.VITE_INSIGHTS_API_URL || 'http://localhost:8000';
        // Debug log for Add modal
        console.log('AI categorize (add) firing', { desc, baseURL, categoriesCount: payload.categories.length });
        const res = await axios.post(`${baseURL}/categorize-expense`, payload);
        const out = res?.data || {};
        if (out && out.predictedCategory && (out.confidence || 0) >= 0.5) {
          const nextSuggestion = { name: out.predictedCategory, confidence: out.confidence, reason: out.reason };
          setAddSuggestion(nextSuggestion);
          // Auto-apply if user hasn't picked a category yet in Add modal
          if (!addCategoryTouched) {
            const match = (Array.isArray(categories) ? categories : []).find(c => (c?.name || '') === nextSuggestion.name);
            if (match && (match.id || match._id)) {
              setNewExp({ ...newExp, categoryId: match.id || match._id });
            }
          }
        }
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [newExp?.description, newExp?.type, newExp?.amount, catKeywords]);

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
            {filtered.map((e) => {
              const isRecurring = (e?.recurring?.isRecurring ?? e?.isRecurring) === true;
              const freqRaw = e?.recurring?.frequency || e?.recurring?.recurringFrequency || e?.recurringFrequency || e?.frequency;
              const freqLabel = typeof freqRaw === 'string' ? (
                {
                  DAILY: 'Daily',
                  WEEKLY: 'Weekly',
                  MONTHLY: 'Monthly',
                  QUARTERLY: 'Quarterly',
                  YEARLY: 'Yearly',
                  CUSTOM: 'Custom',
                }[freqRaw.toUpperCase?.() || ''] || freqRaw
              ) : '';
              const nextDue = e?.recurring?.nextDue || e?.recurring?.nextDueDate || e?.nextRunDate || e?.nextDueDate || e?.nextDue;
              const startDate = e?.recurring?.startDate || e?.startDate;
              const endDate = e?.recurring?.endDate || e?.endDate;
              const fmt = (d) => (d && dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : '');
              return (
                <tr key={e.id || e._id} className="border-t border-gray-100">
                  <td className="p-3">{dayjs(e.date).isValid() ? dayjs(e.date).format('YYYY-MM-DD') : ''}</td>
                  <td className="p-3">{e.category?.name || e.category || e.categoryId}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{e.description}</span>
                      {isRecurring && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200" title="Recurring expense">
                          ⟳ Recurring
                        </span>
                      )}
                    </div>
                    {isRecurring && (
                      <div className="mt-1 text-xs text-gray-500 space-x-3">
                        {freqLabel && <span><strong>Freq:</strong> {freqLabel}</span>}
                        {nextDue && <span><strong>Next:</strong> {fmt(nextDue)}</span>}
                        {startDate && <span><strong>Start:</strong> {fmt(startDate)}</span>}
                        {endDate && <span><strong>End:</strong> {fmt(endDate)}</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{e.paymentMethod?.type || e.paymentType || e.modeOfPayment || e.payment_mode || '—'}</td>
                  <td className="p-3">₹{Number(e.amount).toFixed(2)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                        onClick={()=> {
                          const isRecurring = (e?.recurring?.isRecurring ?? e?.isRecurring) === true;
                          const freqRaw = e?.recurring?.frequency || e?.recurring?.recurringFrequency || e?.recurringFrequency || e?.frequency || '';
                          const startDate = e?.recurring?.startDate || e?.startDate || '';
                          const endDate = e?.recurring?.endDate || e?.endDate || '';
                          const nextDue = e?.recurring?.nextDue || e?.recurring?.nextDueDate || e?.nextRunDate || e?.nextDueDate || e?.nextDue || '';
                          setEditExp({
                            id: e.id || e._id,
                            categoryId: e.category?.id || e.category?._id || e.categoryId || '',
                            amount: e.amount || '',
                            type: (typeof e.type === 'string' ? e.type : (e.type?.name || 'EXPENSE')), // default EXPENSE
                            paymentType: e.paymentMethod?.type || e.paymentType || e.modeOfPayment || e.payment_mode || '',
                            date: (dayjs(e.date).isValid() ? dayjs(e.date).format('YYYY-MM-DD') : ''),
                            title: e.title || e.name || e.description || '',
                            description: e.description || '',
                            isRecurring,
                            recurringFrequency: typeof freqRaw === 'string' ? freqRaw : '',
                            startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : '',
                            endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : '',
                            nextDue: nextDue ? dayjs(nextDue).format('YYYY-MM-DD') : '',
                            error: '',
                          });
                        }}
                      >Edit</button>
                      <button className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700" onClick={async ()=>{
                        if (!window.confirm('Are you sure you want to delete this expense?')) return;
                        try { await deleteExpense(e.id || e._id); await loadData(); } catch {}
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
            {addError && (
              <div className="mb-3 text-sm text-red-700 bg-red-100 rounded p-2">{addError}</div>
            )}
            <div className="space-y-3">
              {addSuggestion && (newExp.type === 'EXPENSE' || !newExp.type) && (
                <div className="p-2 rounded border border-blue-200 bg-blue-50 text-sm text-blue-800 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs mt-0.5" title="AI suggestion">i</span>
                    <div>
                      Suggested category: <b>{addSuggestion.name}</b>
                      {typeof addSuggestion.confidence === 'number' && (
                        <span> (confidence {(addSuggestion.confidence * 100).toFixed(0)}%)</span>
                      )}
                      {addSuggestion.reason ? <div className="text-blue-700/80 mt-0.5">{addSuggestion.reason}</div> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-blue-600 text-white"
                    onClick={() => {
                      const match = (Array.isArray(categories) ? categories : []).find(c => (c?.name || '') === addSuggestion.name);
                      if (match && (match.id || match._id)) {
                        setNewExp({ ...newExp, categoryId: match.id || match._id });
                      }
                    }}
                  >Use</button>
                </div>
              )}
              <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.categoryId} onChange={(e)=>setNewExp({...newExp, categoryId:e.target.value})}>
                <option value="">Select category</option>
                {categoryOptions.map(c=> (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input type="number" placeholder="Amount" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.amount} onChange={(e)=>setNewExp({...newExp, amount:e.target.value})} />
              <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.type} onChange={(e)=>setNewExp({...newExp, type:e.target.value})}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
              <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.paymentType} onChange={(e)=>setNewExp({...newExp, paymentType:e.target.value})}>
                <option value="">Payment method</option>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Net Banking</option>
              </select>
              <input type="date" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.date} onChange={(e)=>setNewExp({...newExp, date:e.target.value})} />
              <input type="text" placeholder="Description" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={newExp.description} onChange={(e)=>setNewExp({...newExp, description:e.target.value})} />

              {/* Recurring section (integrated, consistent styling) */}
              <div className="mt-2 p-4 rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!newExp.isRecurring}
                      onChange={(e)=>setNewExp({...newExp, isRecurring: e.target.checked})}
                    />
                    <span>Make this a recurring expense</span>
                  </label>

                  <select
                    className="w-full sm:w-auto p-3 rounded border border-gray-200 bg-white"
                    value={newExp.recurringFrequency}
                    onChange={(e)=>setNewExp({...newExp, recurringFrequency: e.target.value})}
                    disabled={!newExp.isRecurring}
                    aria-disabled={!newExp.isRecurring}
                    title={!newExp.isRecurring ? 'Enable recurring to select frequency' : 'Frequency'}
                  >
                    <option value="">Frequency</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                {newExp.isRecurring && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">Start Date</label>
                      <input
                        type="date"
                        className="w-full p-3 rounded border border-gray-200 bg-white"
                        value={newExp.startDate}
                        onChange={(e)=>setNewExp({...newExp, startDate: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-1">
                      <label className="text-xs text-gray-600">End Date</label>
                      <input
                        type="date"
                        className="w-full p-3 rounded border border-gray-200 bg-white"
                        value={newExp.endDate}
                        onChange={(e)=>setNewExp({...newExp, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-200 bg-white" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-black text-white" onClick={async ()=>{
                  try {
                    setAddError('');
                    const payload = {
                      categoryId: newExp.categoryId,
                      amount: Number(newExp.amount),
                      description: newExp.description,
                      type: newExp.type,
                      paymentType: newExp.paymentType,
                      date: `${newExp.date}T00:00:00`,
                    };
                    // Validate and include recurring fields only when enabled
                    if (newExp.isRecurring) {
                      if (!newExp.recurringFrequency) {
                        setAddError('Please select a recurring interval');
                        return;
                      }
                      if (!newExp.startDate) {
                        setAddError('Please choose a start date for recurring expense');
                        return;
                      }
                      if (newExp.endDate && newExp.startDate > newExp.endDate) {
                        setAddError('End date must be after start date');
                        return;
                      }
                      payload.isRecurring = true;
                      payload.recurringFrequency = newExp.recurringFrequency;
                      payload.startDate = newExp.startDate;
                      payload.endDate = newExp.endDate || null;
                    }
                    const { addExpense } = await import('../api');
                    await addExpense(payload);
                    setShowAdd(false);
                    setNewExp({
                      categoryId: '', amount: '', paymentType: '', date: dayjs().format('YYYY-MM-DD'), description: '',
                      isRecurring: false, recurringFrequency: '', startDate: '', endDate: '',
                    });
                    await loadData();
                  } catch (e) {
                    setAddError(e?.response?.data?.message || 'Failed to add expense');
                  }
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setEditExp(null)} />
          <div className="relative z-10 w-full max-w-lg p-6 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Expense</h3>
              <button className="text-gray-500 hover:text-black" onClick={()=>setEditExp(null)}>✕</button>
            </div>
            <div className="space-y-3">
              {editExp.error && (
                <div className="mb-1 text-sm text-red-700 bg-red-100 rounded p-2">{editExp.error}</div>
              )}

              {editSuggestion && (editExp.type === 'EXPENSE' || !editExp.type) && (
                <div className="p-2 rounded border border-blue-200 bg-blue-50 text-sm text-blue-800 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs mt-0.5" title="AI suggestion">i</span>
                    <div>
                      Suggested category: <b>{editSuggestion.name}</b>
                      {typeof editSuggestion.confidence === 'number' && (
                        <span> (confidence {(editSuggestion.confidence * 100).toFixed(0)}%)</span>
                      )}
                      {editSuggestion.reason ? <div className="text-blue-700/80 mt-0.5">{editSuggestion.reason}</div> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-blue-600 text-white"
                    onClick={() => {
                      const match = (Array.isArray(categories) ? categories : []).find(c => (c?.name || '') === editSuggestion.name);
                      if (match && (match.id || match._id)) {
                        setEditExp({ ...editExp, categoryId: match.id || match._id });
                      }
                    }}
                  >Use</button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={editExp.categoryId} onChange={(e)=>{ setEditCategoryTouched(true); setEditExp({...editExp, categoryId:e.target.value}); }}>
                  {categoryOptions.map(c=> (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="number" className="w-full p-3 rounded-md border border-gray-200 bg-white" placeholder="Amount" value={editExp.amount} onChange={(e)=>setEditExp({...editExp, amount:e.target.value})} />
                <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={editExp.type || 'EXPENSE'} onChange={(e)=>setEditExp({...editExp, type: e.target.value})}>
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
                <input type="date" className="w-full p-3 rounded-md border border-gray-200 bg-white" value={editExp.date} onChange={(e)=>setEditExp({...editExp, date:e.target.value})} />
                <select className="w-full p-3 rounded-md border border-gray-200 bg-white" value={editExp.paymentType} onChange={(e)=>setEditExp({...editExp, paymentType:e.target.value})}>
                  <option value="">Payment method</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Net Banking</option>
                </select>
              </div>
              <input type="text" className="w-full p-3 rounded-md border border-gray-200 bg-white" placeholder="Title / name" value={editExp.title} onChange={(e)=>setEditExp({...editExp, title: e.target.value})} />
              <input type="text" className="w-full p-3 rounded-md border border-gray-200 bg-white" placeholder="Description / notes" value={editExp.description} onChange={(e)=>setEditExp({...editExp, description:e.target.value})} />

              <div className="mt-2 p-4 rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!editExp.isRecurring} onChange={(e)=>setEditExp({...editExp, isRecurring: e.target.checked})} />
                    <span>Recurring</span>
                  </label>
                  <select
                    className="w-full sm:w-auto p-3 rounded border border-gray-200 bg-white"
                    value={editExp.recurringFrequency || ''}
                    onChange={(e)=>setEditExp({...editExp, recurringFrequency: e.target.value})}
                    disabled={!editExp.isRecurring}
                    aria-disabled={!editExp.isRecurring}
                    title={!editExp.isRecurring ? 'Enable recurring to select frequency' : 'Frequency'}
                  >
                    <option value="">Frequency</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                {editExp.isRecurring && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">Start Date</label>
                      <input type="date" className="w-full p-3 rounded border border-gray-200 bg-white" value={editExp.startDate} onChange={(e)=>setEditExp({...editExp, startDate: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">End Date</label>
                      <input type="date" className="w-full p-3 rounded border border-gray-200 bg-white" value={editExp.endDate} onChange={(e)=>setEditExp({...editExp, endDate: e.target.value})} />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-200 bg-white" onClick={()=>setEditExp(null)}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-black text-white" onClick={async ()=>{
                  try {
                    // Basic validation
                    if (!editExp.categoryId) { setEditExp(s=>({...s, error: 'Please select category'})); return; }
                    if (!editExp.amount || Number(editExp.amount) <= 0) { setEditExp(s=>({...s, error: 'Please enter a valid amount'})); return; }
                    if (!editExp.date) { setEditExp(s=>({...s, error: 'Please select a date'})); return; }

                    const payload = {
                      categoryId: editExp.categoryId,
                      amount: Number(editExp.amount),
                      description: editExp.description,
                      title: editExp.title,
                      type: editExp.type || 'EXPENSE',
                      paymentType: editExp.paymentType,
                      date: `${editExp.date}T00:00:00`,
                    };

                    if (editExp.isRecurring) {
                      if (!editExp.recurringFrequency) { setEditExp(s=>({...s, error: 'Please select a recurring interval'})); return; }
                      if (!editExp.startDate) { setEditExp(s=>({...s, error: 'Please choose a start date for recurring expense'})); return; }
                      if (editExp.endDate && editExp.startDate > editExp.endDate) { setEditExp(s=>({...s, error: 'End date must be after start date'})); return; }
                      payload.isRecurring = true;
                      payload.recurringFrequency = editExp.recurringFrequency;
                      payload.startDate = editExp.startDate;
                      payload.endDate = editExp.endDate || null;
                      if (editExp.nextDue) payload.nextDueDate = editExp.nextDue; // optional
                      payload.recurring = {
                        isRecurring: true,
                        frequency: editExp.recurringFrequency,
                        startDate: `${editExp.startDate}T00:00:00`,
                        endDate: editExp.endDate ? `${editExp.endDate}T00:00:00` : undefined,
                      };
                      if (editExp.nextDue) payload.recurring.nextDue = `${editExp.nextDue}T00:00:00`;
                    } else {
                      payload.isRecurring = false;
                      payload.recurring = { isRecurring: false };
                    }

                    await updateExpense(editExp.id, payload);
                    setEditExp(null);
                    await loadData();
                  } catch (e) {
                    setEditExp(s=>({...s, error: e?.response?.data?.message || 'Failed to update expense'}));
                  }
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}