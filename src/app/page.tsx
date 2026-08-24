'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, MapPinned, BellRing, BarChart3 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-900">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,_#d1fae5_0%,_transparent_27%),radial-gradient(circle_at_85%_10%,_#bfdbfe_0%,_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_52%,_#ecfdf5_100%)]" />
      <div className="absolute -left-20 top-96 -z-10 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute -right-24 top-36 -z-10 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="relative mx-auto flex max-w-7xl flex-col px-6 pb-16 pt-7 lg:px-10 lg:pt-10">
        <header className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">SafaiSathi</p>
            <h1 className="text-lg font-bold text-slate-900">Municipal Waste Intelligence</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://safai-citizen.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:px-4"
            >
              Safai-Citizen
            </a>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </header>

        <section className="mt-12 grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live municipal intelligence
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight text-slate-900 md:text-5xl">
              Cleaner streets start with <span className="text-emerald-700">quicker action.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              SafaiSathi helps municipalities monitor garbage hotspots, prioritize high-risk zones, and coordinate field workers using a single readable dashboard.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
              >
                Start Monitoring
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-100" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">City pulse</p>
                <p className="mt-1 text-xl font-black text-slate-900">One view. Faster response.</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-lg shadow-emerald-600/25">S</div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Active Wards</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">42</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Detected Points</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">1,284</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Avg Response</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">2.3h</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Field Staff</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">96</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Live Heatmap Tracking',
              copy: 'Visualize detection hotspots across municipal areas in real time.',
              icon: MapPinned,
              tone: 'bg-blue-50 text-blue-700'
            },
            {
              title: 'Reliable Alerting',
              copy: 'Trigger rapid action with detection confidence based signals.',
              icon: BellRing,
              tone: 'bg-amber-50 text-amber-700'
            },
            {
              title: 'Operational Reporting',
              copy: 'Generate readable reports for teams and city officials quickly.',
              icon: BarChart3,
              tone: 'bg-emerald-50 text-emerald-700'
            },
            {
              title: 'Secure Team Access',
              copy: 'Keep sensitive operations protected through authenticated workflows.',
              icon: ShieldCheck,
              tone: 'bg-slate-100 text-slate-700'
            }
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`inline-flex rounded-lg p-2 ${feature.tone}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.copy}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
