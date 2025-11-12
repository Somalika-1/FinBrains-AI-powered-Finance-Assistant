import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { logout } = useAuth();
  return (
    <div className="w-full h-14 flex items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow">
      <div className="font-semibold tracking-wide">FinBrains: Personal Finance Assistant</div>
      <button onClick={logout} className="text-sm px-3 py-1.5 rounded bg-white/15 hover:bg-white/25">Logout</button>
    </div>
  );
}
