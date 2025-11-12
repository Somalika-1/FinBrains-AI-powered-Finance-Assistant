import React, { useEffect, useState } from 'react';
import { addExpense, getCategories } from '../api';
import { useNavigate } from 'react-router-dom';

export default function AddExpense() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    description: '',
    paymentType: '',
    date: new Date().toISOString().slice(0,10),
  });
  const [error, setError] = useState('');
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
    })();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        description: form.description,
        paymentType: form.paymentType,
        date: `${form.date}T00:00:00`,
      };
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
        <select required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.categoryId} onChange={(e)=>setForm({...form, categoryId:e.target.value})}>
          <option value="">Select category</option>
          {(Array.isArray(categories) ? categories : []).map((c)=> (
            <option key={c.id || c._id || c.name} value={c.id || c._id || c.name}>{c.name}</option>
          ))}
        </select>
        <input type="number" required placeholder="Amount" className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.amount} onChange={(e)=>setForm({...form, amount:e.target.value})} />
        <input type="text" placeholder="Description" className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} />
        <select required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.paymentType} onChange={(e)=>setForm({...form, paymentType:e.target.value})}>
          <option value="">Payment type</option>
          <option>Cash</option>
          <option>Card</option>
          <option>UPI</option>
          <option>Net Banking</option>
        </select>
        <input type="date" required className="w-full p-3 rounded border border-white/30 bg-white/80" value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})} />
        <button className="px-4 py-2 rounded bg-black text-white">Add</button>
      </form>
    </div>
  );
}
