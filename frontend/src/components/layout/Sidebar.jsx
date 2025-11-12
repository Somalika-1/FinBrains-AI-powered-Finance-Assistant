import React from 'react';
import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) => `flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors ${isActive ? 'bg-black/10 text-black' : 'text-gray-700 hover:bg-black/5'}`;

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-full p-3 border-r border-white/20 bg-white/50 backdrop-blur">
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
