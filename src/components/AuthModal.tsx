'use client';

import React, { useState } from 'react';
import { X, Lock, User, Mail, LogIn, UserPlus } from 'lucide-react';
import { UserSession } from '@/types/drone';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/maping/api/auth/register' : '/maping/api/auth/login';
      const body = isRegister ? { username, email, password } : { username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="flex border-b border-slate-200 mb-5 pb-2">
          <button
            onClick={() => {
              setIsRegister(false);
              setErrorMsg('');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-sm font-bold transition border-b-2 -mb-2 cursor-pointer ${
              !isRegister
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <LogIn className="w-4 h-4" /> Masuk
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setErrorMsg('');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-sm font-bold transition border-b-2 -mb-2 cursor-pointer ${
              isRegister
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Daftar Akun
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-2xl mb-4 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="aris"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email (Opsional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pilot@qbyte.web.id"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 mt-2"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Daftar Sekarang
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Masuk ke Akun
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
