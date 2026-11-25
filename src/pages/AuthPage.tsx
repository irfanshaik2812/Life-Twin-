import React, { useState } from 'react';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { useLifeTwin } from '../context/LifeTwinContext';
import { BrandMark } from '../components/common/BrandMark';

export function AuthPage() {
  const { navigate, signIn, signInDemo, loading, error, clearError } = useLifeTwin();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    await signIn(email, password);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setStatusMsg(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error || 'Could not start password reset.');
      return;
    }
    setStatusMsg(data.message);
    if (data.previewResetCode) {
      setPreviewCode(data.previewResetCode);
    }
    setMode('reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: resetCode, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error || 'Reset failed.');
      return;
    }
    setStatusMsg(data.message);
    setPreviewCode(null);
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col justify-between px-6 py-8">
      <div className="max-w-[1120px] w-full mx-auto flex items-center justify-between">
        <button onClick={() => navigate('intro')} className="cursor-pointer">
          <BrandMark />
        </button>
        <button
          onClick={() => navigate('landing')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0B1D39] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-2xl border border-slate-200 p-8 my-8">
        <h1 className="font-display text-2xl font-bold text-[#0B1D39]">
          {mode === 'login'
            ? 'Sign In to LifeTwin AI'
            : mode === 'forgot'
            ? 'Reset Password'
            : 'Enter Verification Code'}
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          {mode === 'login'
            ? 'Access your private Digital Twin, physiological history, and experiments.'
            : 'Recover access to your personal health intelligence account.'}
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}
        {statusMsg && (
          <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800">
            {statusMsg}
            {previewCode && (
              <p className="mt-1 font-mono-tabular font-semibold">
                Preview Reset Code: {previewCode}
              </p>
            )}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setStatusMsg(null);
                    setMode('forgot');
                  }}
                  className="text-xs text-sky-700 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#0B1D39] text-white font-semibold text-sm hover:bg-[#132E59] transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#0B1D39] text-white font-semibold text-sm hover:bg-[#132E59] transition-colors cursor-pointer"
            >
              Request Reset Code
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs text-slate-600 hover:text-[#0B1D39] cursor-pointer"
            >
              Return to Sign In
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">6-Digit Code</label>
              <input
                type="text"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#0B1D39] text-white font-semibold text-sm hover:bg-[#132E59] transition-colors cursor-pointer"
            >
              Update Password
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
          <button
            type="button"
            onClick={() => signInDemo()}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-sm hover:bg-sky-100 transition-colors cursor-pointer"
          >
            Enter Demo Profile (Alex Rivera)
          </button>
          <p className="text-center text-xs text-slate-600">
            New to LifeTwin AI?{' '}
            <button
              type="button"
              onClick={() => navigate('onboarding')}
              className="text-sky-700 font-semibold hover:underline cursor-pointer"
            >
              Start Personalized Onboarding
            </button>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted credentials · Private user-scoped database records</span>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        <KeyRound className="inline w-3.5 h-3.5 mr-1" />
        LifeTwin AI is a personal wellness intelligence platform, not a medical diagnostic tool.
      </div>
    </div>
  );
}
