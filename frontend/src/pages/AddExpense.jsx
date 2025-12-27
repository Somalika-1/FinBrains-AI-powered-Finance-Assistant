import React, { useEffect, useState } from 'react';
import { addExpense, getCategories } from '../api';
import api from '../api/axios';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AddExpense() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    description: '',
    type: 'EXPENSE',
    paymentType: '',
    date: new Date().toISOString().slice(0,10),
    isRecurring: false,
    recurringFrequency: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [catKeywords, setCatKeywords] = useState([]); // [{id,name,keywords}]
  const [suggestion, setSuggestion] = useState(null); // {name, confidence, reason}
  const [categoryTouched, setCategoryTouched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getCategories();
        // Handle either array or envelope (data.data)
        const list = Array.isArray(data) ? data : (data?.data || data?.categories);
        const safeList = Array.isArray(list) ? list : [];
        setCategories(safeList);
      } catch (e) {}
      try {
        const { data } = await api.get('/api/categories/keywords');
        const list = Array.isArray(data) ? data : (data?.data || []);
        setCatKeywords(Array.isArray(list) ? list : []);
      } catch (e) {}
    })();
  }, []);

  // Debounced categorization suggestion for EXPENSE type
  useEffect(() => {
    setSuggestion(null);
    const isExpense = form.type === 'EXPENSE';
    const desc = (form.description || '').trim();
    if (!isExpense || desc.length < 3) return;
    const timer = setTimeout(async () => {
      try {
        // Build dynamic categories payload (exclude Monthly Income)
        const payload = {
          description: desc,
          amount: Number(form.amount || 0) || 0,
          categories: (Array.isArray(catKeywords) ? catKeywords : [])
            .filter(c => (c?.name || '').toLowerCase() !== 'monthly income')
            .map(c => ({ name: c.name, keywords: Array.isArray(c.keywords) ? c.keywords : [] })),
        };
        const baseURL = import.meta.env.VITE_INSIGHTS_API_URL || 'http://localhost:8000';
        // Debug log to verify effect is firing and what will be called
        console.log('AI categorize firing', { desc, baseURL, categoriesCount: payload.categories.length });
        const res = await axios.post(`${baseURL}/categorize-expense`, payload);
        const out = res?.data || {};
        if (out && out.predictedCategory && (out.confidence || 0) >= 0.5) {
          const nextSuggestion = { name: out.predictedCategory, confidence: out.confidence, reason: out.reason };
          setSuggestion(nextSuggestion);
          // Auto-apply to dropdown if user hasn't manually changed category
          if (!categoryTouched) {
            const match = (Array.isArray(categories) ? categories : []).find(c => (c?.name || '') === nextSuggestion.name);
            if (match && (match.id || match._id)) {
              setForm({ ...form, categoryId: match.id || match._id });
            }
          }
        }
      } catch (e) {
        // ignore suggestion errors

      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.description, form.type, form.amount, catKeywords]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        description: form.description,
        type: form.type,
        paymentType: form.paymentType,
        date: `${form.date}T00:00:00`,
        isRecurring: !!form.isRecurring,
        recurringFrequency: form.isRecurring ? (form.recurringFrequency || null) : null,
        startDate: form.isRecurring && form.startDate ? form.startDate : null,
        endDate: form.isRecurring && form.endDate ? form.endDate : null,
      };
      if (payload.isRecurring) {
        if (!payload.recurringFrequency) {
          setError('Please select a recurring interval');
          return;
        }
        if (!form.startDate) {
          setError('Please choose a start date for recurring expense');
          return;
        }
        // Optional: prevent startDate > endDate
        if (form.endDate && form.startDate > form.endDate) {
          setError('End date must be after start date');
          return;
        }
      }
      await addExpense(payload);
      navigate('/expenses');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to add expense');
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold mb-4">Add Expense</h2>
      {error && <div className="mb-3 text-sm text-red-700 bg-red-100 rounded p-2">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        {suggestion && (
          <div className="p-2 rounded border border-blue-200 bg-blue-50 text-sm text-blue-800 flex items-center justify-between gap-3">
            <div>
              Suggested category: <b>{suggestion.name}</b>
              {typeof suggestion.confidence === 'number' && (
                <span> (confidence {(suggestion.confidence * 100).toFixed(0)}%)</span>
              )}
              {suggestion.reason ? <span className="ml-2 text-blue-700/80">— {suggestion.reason}</span> : null}
            </div>
            <button type="button" className="px-2 py-1 rounded bg-blue-600 text-white"
                    onClick={() => {
                      // Apply suggestion by name -> find id
                      const match = (Array.isArray(categories) ? categories : []).find(c => (c?.name || '') === suggestion.name);
                      if (match && (match.id || match._id)) {
                        setForm({ ...form, categoryId: match.id || match._id });
                      }
                    }}
            >Use</button>
          </div>
        )}
        <select required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.categoryId} onChange={(e)=>{ setCategoryTouched(true); setForm({...form, categoryId:e.target.value}); }}>
          <option value="">Select category</option>
          {(Array.isArray(categories) ? categories : []).map((c)=> (
            <option key={c.id || c._id || c.name} value={c.id || c._id || c.name}>{c.name}</option>
          ))}
        </select>
        <input type="number" required placeholder="Amount" className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.amount} onChange={(e)=>setForm({...form, amount:e.target.value})} />
        <input type="text" placeholder="Description" className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} />
        <select required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.type} onChange={(e)=>setForm({...form, type:e.target.value})}>
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
        <select required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.paymentType} onChange={(e)=>setForm({...form, paymentType:e.target.value})}>
          <option value="">Payment type</option>
          <option>Cash</option>
          <option>Card</option>
          <option>UPI</option>
          <option>Net Banking</option>
        </select>
        <input type="date" required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})} />

        {/* Recurring section card (always visible toggle + frequency dropdown) */}
        <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-white/80">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.isRecurring} onChange={(e)=>setForm({...form, isRecurring:e.target.checked})} />
              <span>Make this a recurring expense</span>
            </label>

            <select className="w-full sm:w-auto p-3 rounded border border-gray-200 bg-white"
                    value={form.recurringFrequency}
                    onChange={(e)=>setForm({...form, recurringFrequency:e.target.value})}
                    disabled={!form.isRecurring}
                    aria-disabled={!form.isRecurring}
                    title={!form.isRecurring ? 'Enable recurring to select frequency' : 'Frequency'}>
              <option value="">Frequency</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {form.isRecurring && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="date" className="w-full p-3 rounded border border-gray-200 bg-white"
                     value={form.startDate}
                     onChange={(e)=>setForm({...form, startDate:e.target.value})}
                     placeholder="Start Date" />

              <input type="date" className="w-full p-3 rounded border border-gray-200 bg-white sm:col-span-2"
                     value={form.endDate}
                     onChange={(e)=>setForm({...form, endDate:e.target.value})}
                     placeholder="End Date (optional)" />
            </div>
          )}
        </div>

        <button className="mt-4 px-4 py-2 rounded bg-black text-white">Add</button>
      </form>
    </div>
  );
}
