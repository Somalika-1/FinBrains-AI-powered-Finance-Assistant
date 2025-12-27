import React, { useEffect, useState, useMemo } from 'react';
import { getCategories, createCategory, deleteCategory } from '../api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await getCategories();
      const list = Array.isArray(data) ? data : (data?.data || data?.categories);
      setCategories(Array.isArray(list) ? list : []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const items = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Manage Categories</h2>
          <p className="text-sm text-gray-600">Create and delete categories</p>
        </div>
        <div className="flex gap-2">
          <input
            className="p-2 rounded-md border border-gray-200 bg-white shadow-sm"
            placeholder="New category name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
          <button
            disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-md bg-black text-white shadow hover:bg-black/90 disabled:opacity-60"
            onClick={async ()=>{
              if (!name.trim()) return;
              setLoading(true);
              try { await createCategory(name.trim()); setName(''); await load(); } finally { setLoading(false); }
            }}
          >{loading ? 'Adding...' : 'Add Category'}</button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white shadow p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500">No categories yet</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((c) => (
              <div key={c.id || c._id || c.name} className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-sm flex items-center gap-2">
                <span>{c.name}</span>
                <button
                  className="text-red-600 hover:text-red-700"
                  onClick={async ()=>{
                    // Protect predefined/non-deletable categories on the client side
                    const isProtected = (c?.name && c.name.toLowerCase() === 'monthly income') || !!c?.isPredefined;
                    if (isProtected) {
                      setError("This category is pre-added and cannot be deleted.");
                      setTimeout(()=>setError(''), 3500);
                      return;
                    }
                    if (!window.confirm('Deleting this category will also remove all related expenses. Are you sure?')) return;
                    try {
                      await deleteCategory(c.id || c._id || c.name);
                      await load();
                    } catch (e) {
                      const msg = e?.response?.data?.message || 'Failed to delete category';
                      setError(msg);
                      setTimeout(()=>setError(''), 3500);
                    }
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
