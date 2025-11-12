import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await forgotPassword(email);
    setMsg(res?.message || 'If an account exists, a reset link has been sent.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FF6767]">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Forgot Password</h2>
        <p className="text-sm text-gray-600 mb-4">Enter your email to receive a reset link.</p>
        {msg && <div className="mb-3 text-sm text-green-700 bg-green-100 rounded p-2">{msg}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" required placeholder="Email" className="w-full p-3 rounded border border-gray-200" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <button disabled={loading} className="w-full p-3 rounded bg-black text-white hover:bg-black/90 disabled:opacity-60">{loading? 'Sending...' : 'Send Reset Link'}</button>
        </form>
      </div>
    </div>
  );
}
