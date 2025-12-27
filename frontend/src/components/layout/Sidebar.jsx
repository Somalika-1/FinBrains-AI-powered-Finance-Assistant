import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) => `flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors ${isActive ? 'bg-black/10 text-black' : 'text-gray-700 hover:bg-black/5'}`;

export default function Sidebar() {
  const [summary, setSummary] = useState(null); // { name, month, income, spent, balance }
  const [err, setErr] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const { data } = await api.get('/api/users/me/monthly-summary');
        const payload = Array.isArray(data) ? null : (data?.data || data);
        if (payload && typeof payload === 'object') setSummary(payload);
      } catch (e) {
        setErr('');
      }
    })();
  }, [ isAuthenticated ]);

  return (
    <aside className="w-64 shrink-0 h-full p-3 border-r border-white/20 bg-white/70 backdrop-blur">
      {summary && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm">
          <div className="text-xs text-gray-500">Welcome</div>
          <div className="text-base font-semibold text-gray-900 truncate">{summary.name}</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white border border-gray-100">
              <div className="text-[10px] text-gray-500">Income</div>
              <div className="text-sm font-semibold text-emerald-700">₹{Number(summary.income || 0).toFixed(0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-gray-100">
              <div className="text-[10px] text-gray-500">Spent</div>
              <div className="text-sm font-semibold text-rose-700">₹{Number(summary.spent || 0).toFixed(0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-gray-100">
              <div className="text-[10px] text-gray-500">Balance</div>
              <div className="text-sm font-semibold text-gray-900">₹{Number(summary.balance || 0).toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}
      <nav className="space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <span>🏠</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/budget" className={linkClass}>
          <span>💼</span>
          <span>Budget</span>
        </NavLink>
        <NavLink to="/expenses" className={linkClass}>
          <span>📄</span>
          <span>Expenses</span>
        </NavLink>
        <NavLink to="/categories" className={linkClass}>
          <span>🗂️</span>
          <span>Manage Categories</span>
        </NavLink>
      </nav>
    </aside>
  );
}
