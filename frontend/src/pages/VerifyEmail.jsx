import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [search] = useSearchParams();
  const tokenParam = search.get('token');
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState({ loading: !!tokenParam });
  const [token, setToken] = useState(tokenParam || '');
  const navigate = useNavigate();

  useEffect(() => {
    if (!tokenParam) return;
    (async () => {
      const res = await verifyEmail(tokenParam || '');
      setStatus({ loading: false, ...res });
    })();
  }, [tokenParam, verifyEmail]);

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl bg-white shadow border border-gray-100 mt-10 text-center">
      <h2 className="text-2xl font-semibold mb-2">Email Verification</h2>
      {status.loading ? (
        <p className="text-gray-600">Verifying...</p>
      ) : status.success ? (
        <>
          <p className="text-green-700">Your email has been verified successfully.</p>
          <button onClick={() => navigate('/login')} className="mt-4 px-4 py-2 rounded-md bg-black text-white">Go to Login</button>
        </>
      ) : tokenParam ? (
        <>
          <p className="text-red-700">{status?.message || 'Verification failed.'}</p>
          <Link to="/signup" className="mt-4 inline-block px-4 py-2 rounded-md border border-gray-200">Back to Signup</Link>
        </>
      ) : (
        <>
          <p className="text-gray-600 mb-3">Paste your verification token below and click Verify.</p>
          <div className="flex gap-2 justify-center">
            <input className="flex-1 min-w-0 p-2 rounded border border-gray-200" placeholder="Verification token" value={token} onChange={(e)=>setToken(e.target.value)} />
            <button className="px-4 py-2 rounded-md bg-black text-white" onClick={async ()=>{
              setStatus({ loading: true });
              const res = await verifyEmail(token || '');
              setStatus({ loading: false, ...res });
            }}>Verify</button>
          </div>
          <div className="mt-4 text-sm text-gray-500">Didn’t get the email? Check spam or try again later.</div>
        </>
      )}
    </div>
  );
}
