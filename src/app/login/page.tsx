'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#faf6f0] px-4 py-12 sm:px-6 lg:px-8 text-[#241c15]">
      {/* Ambient background glows */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,_#f0e5d5_0%,_transparent_35%),radial-gradient(circle_at_85%_10%,_#eddcd2_0%,_transparent_40%),linear-gradient(180deg,_#fcfaf6_0%,_#f5efe6_50%,_#eee4d6_100%)]" />
      <div className="absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-[#964b28]/15 blur-3xl" />
      <div className="absolute -right-24 bottom-10 -z-10 h-80 w-80 rounded-full bg-[#ded8c4]/60 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#6b5c4e] transition hover:text-[#964b28]">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div className="rounded-3xl border border-[#e5dcce] bg-white/95 p-6 shadow-xl shadow-[#a35638]/10 sm:p-8 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0e2d8] shadow-sm">
              <Lock className="h-7 w-7 text-[#964b28]" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#964b28]">SafaiSathi Workspace</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1f1712]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-[#6b5c4e]">
              Or{' '}
              <Link
                href="/signup"
                className="font-bold text-[#964b28] hover:text-[#7e3e1f]"
              >
                create a new account
              </Link>
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="overflow-hidden rounded-2xl border border-[#ded5c5] shadow-sm -space-y-px bg-[#fdfbf7]">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[#9c8e7e]" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="relative block w-full border-b border-[#ded5c5] bg-[#fdfbf7] px-3 py-3.5 pl-10 text-[#241c15] placeholder:text-[#9c8e7e] focus:z-10 focus:border-[#964b28] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#964b28]/20 sm:text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#9c8e7e]" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="relative block w-full bg-[#fdfbf7] px-3 py-3.5 pl-10 pr-10 text-[#241c15] placeholder:text-[#9c8e7e] focus:z-10 focus:border-[#964b28] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#964b28]/20 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-[#9c8e7e]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[#9c8e7e]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-center text-sm font-medium text-red-700">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="relative flex w-full justify-center rounded-xl bg-[#964b28] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#964b28]/25 transition hover:bg-[#7e3e1f] focus:outline-none focus:ring-2 focus:ring-[#964b28] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="#" className="font-bold text-[#964b28] hover:text-[#7e3e1f]">
                  Forgot your password?
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
