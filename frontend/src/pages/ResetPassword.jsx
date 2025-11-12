import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strong = (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p) && p.length >= 8;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    if (!strong(password)) { setErr('Use at least 8 chars with upper, lower, digit, special'); return; }
    setLoading(true);
    const res = await resetPassword(token, password);
    if (res?.success) {
      setMsg('Password reset successfully. You can login now.');
      setTimeout(()=>navigate('/login'), 1200);
    } else {
      setErr(res?.message || 'Reset failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FF6767]">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Reset Password</h2>
        <p className="text-sm text-gray-600 mb-4">Set your new password.</p>
        {msg && <div className="mb-3 text-sm text-green-700 bg-green-100 rounded p-2">{msg}</div>}
        {err && <div className="mb-3 text-sm text-red-700 bg-red-100 rounded p-2">{err}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="password" required placeholder="New password" className="w-full p-3 rounded border border-gray-200" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <input type="password" required placeholder="Confirm password" className="w-full p-3 rounded border border-gray-200" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
          <div className="text-xs text-gray-500">Use at least 8 characters with upper, lower, digit and special symbol.</div>
          <button disabled={loading} className="w-full p-3 rounded bg-black text-white hover:bg-black/90 disabled:opacity-60">{loading? 'Saving...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
}
