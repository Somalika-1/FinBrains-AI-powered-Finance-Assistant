import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const res = await login(form);
    if (res.success) navigate('/dashboard');
    else setError(res.message);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#FF6767]">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: 'url("/images/background.png")', backgroundSize: 'cover' }} />
      <div className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 p-6">
        <h1 className="text-2xl font-bold text-black mb-6 text-center">Welcome Back</h1>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-100 rounded p-2">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="email" required placeholder="Email" className="w-full p-3 rounded border border-white/30 bg-white/60 focus:outline-none" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
          <input type="password" required placeholder="Password" className="w-full p-3 rounded border border-white/30 bg-white/60 focus:outline-none" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.rememberMe} onChange={(e)=>setForm({...form, rememberMe: e.target.checked})} />
              Remember me
            </label>
            <Link to="/forgot" className="text-sm text-blue-700 hover:underline">Forgot password?</Link>
          </div>
          <button disabled={loading} className="w-full p-3 rounded bg-black text-white hover:bg-black/90 disabled:opacity-60">{loading? 'Signing in...' : 'Sign In'}</button>
        </form>
        <p className="mt-4 text-center text-sm">No account? <Link to="/signup" className="underline">Sign up</Link></p>
      </div>
    </div>
  );
}
