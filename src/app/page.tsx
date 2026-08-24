'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Camera,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BellRing,
} from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f2eb]">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-[#ded5c5] border-t-[#964b28]"></div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#faf6f0] text-[#241c15]">
      {/* Warm Parchment & Earthy Background Gradients */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,_#f0e5d5_0%,_transparent_35%),radial-gradient(circle_at_85%_10%,_#eddcd2_0%,_transparent_40%),linear-gradient(180deg,_#fcfaf6_0%,_#f5efe6_50%,_#eee4d6_100%)]" />
      <div className="absolute -left-20 top-96 -z-10 h-80 w-80 rounded-full bg-[#964b28]/10 blur-3xl" />
      <div className="absolute -right-24 top-36 -z-10 h-96 w-96 rounded-full bg-[#ded8c4]/50 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col px-4 pb-16 pt-5 sm:px-6 lg:px-10 lg:pt-10">

        {/* Nav Header */}
        <header className="flex items-center justify-between rounded-2xl border border-[#e5dcce] bg-[#ffffff]/85 px-2.5 py-2 sm:px-5 sm:py-4 shadow-sm backdrop-blur gap-1 sm:gap-3">
          <div className="min-w-0 flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#964b28]">SafaiSathi</p>
            <h1 className="hidden sm:block text-lg font-bold text-[#241c15] leading-tight">The Smart Waste Guardian</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <a
              href="https://safai-citizen.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg bg-[#964b28] px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#7e3e1f]"
            >
              <span className="sm:hidden">Citizen</span>
              <span className="hidden sm:inline">Safai-Citizen</span>
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#241c15] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#3d3126]"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-[#d8cdbd] px-2 py-1 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#4a3b32] transition hover:border-[#964b28] hover:text-[#964b28] bg-white/70"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#241c15] px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d3126]"
                >
                  <span className="sm:hidden">Sign Up</span>
                  <span className="hidden sm:inline">Get Started</span>
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="mt-8 sm:mt-12 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#ded4c5] bg-[#f5ede2]/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#8a4220] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#964b28] animate-pulse" />
              The Smart Waste Guardian For Urban Spaces
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black leading-tight text-[#1f1712]">
              Transforming Cities.{' '}
              <span className="text-[#964b28]">Empowering Communities.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg font-medium text-[#4f4236]">
              AI-powered waste detection that turns existing CCTV into smart urban sensors — instantly.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center rounded-xl bg-[#964b28] px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#7e3e1f]"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard/heatmap"
                    className="inline-flex items-center rounded-xl border border-[#d6c7b5] bg-white/80 px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-[#4a3b32] transition hover:border-[#964b28] hover:text-[#964b28]"
                  >
                    View Live Heatmap
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-xl bg-[#964b28] px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#7e3e1f]"
                  >
                    Start Monitoring
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center rounded-xl border border-[#d6c7b5] bg-white/80 px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-[#4a3b32] transition hover:border-[#964b28] hover:text-[#964b28]"
                  >
                    Open Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* City Pulse Stats Card */}
          <div className="relative overflow-hidden rounded-3xl border border-[#e5dccd] bg-[#fdfbf7]/95 p-5 sm:p-6 shadow-xl shadow-[#a35638]/10 backdrop-blur">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#eddcd2]/50" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#7a6a58]">Live Pulse</p>
                <p className="mt-1 text-lg sm:text-xl font-black text-[#241c15]">Proactive Urban Intelligence</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#964b28] text-lg font-black text-white shadow-lg shadow-[#964b28]/25 flex-shrink-0">
                S
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-[#e8e2d4]/80 p-3 sm:p-4 border border-[#d8d0bf]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#594d3b]">CCTV Sensors</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#241c15]">24/7</p>
                <p className="text-[11px] text-[#6b5c49] mt-0.5">YOLOv8 real-time</p>
              </div>
              <div className="rounded-2xl bg-[#f0e2d8]/90 p-3 sm:p-4 border border-[#dfccc1]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a4220]">Detection Rate</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#241c15]">98.4%</p>
                <p className="text-[11px] text-[#7a4225] mt-0.5">High precision</p>
              </div>
              <div className="rounded-2xl bg-[#e8e2d4]/80 p-3 sm:p-4 border border-[#d8d0bf]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#594d3b]">Avg Response</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#241c15]">&lt; 15 min</p>
                <p className="text-[11px] text-[#6b5c49] mt-0.5">Instant alerts</p>
              </div>
              <div className="rounded-2xl bg-[#f0e2d8]/90 p-3 sm:p-4 border border-[#dfccc1]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a4220]">Citizen Actions</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-[#241c15]">Gamified</p>
                <p className="text-[11px] text-[#7a4225] mt-0.5">Rewards & rankings</p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem vs Solution Section */}
        <section className="mt-12 sm:mt-16 grid gap-6 md:grid-cols-2">
          {/* Problem Statement Card (Slide Khaki-Sand Theme) */}
          <div className="rounded-3xl border border-[#d0c6b4] bg-[#ded8c4] p-5 sm:p-7 shadow-md">
            <div className="flex items-center gap-2 text-[#4a3f2d]">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#8a5024]" />
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider">Problem Statement</h3>
            </div>
            <p className="mt-3 text-base sm:text-lg font-bold text-[#1f1912] italic">
              &ldquo;Urban waste management is reactive, not proactive — missing the real-time intelligence cities need.&rdquo;
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[#382f24]">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-2 w-2 flex-shrink-0 rounded-full bg-[#8a5024]" />
                <span>
                  <strong>Littered streets & public spaces:</strong> Polythene, bottles, and wrappers create serious health risks and visual pollution that authorities cannot monitor effectively.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-2 w-2 flex-shrink-0 rounded-full bg-[#8a5024]" />
                <span>
                  <strong>Slow & inefficient manual management:</strong> Authorities rely on sporadic complaints or rigid cleanup schedules while hotspots go completely undetected.
                </span>
              </li>
            </ul>
          </div>

          {/* Our Solution Card (Slide Terracotta-Clay Theme) */}
          <div className="rounded-3xl border border-[#a85a3c] bg-[#ba7861] p-5 sm:p-7 shadow-md text-white">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-white" />
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white">Our Solution</h3>
            </div>
            <p className="mt-3 text-base sm:text-lg font-bold text-[#fef9f5] italic">
              &ldquo;SafaiSathi transforms existing infrastructure into intelligent waste monitoring systems.&rdquo;
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[#fcf3ec]">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-2 w-2 flex-shrink-0 rounded-full bg-white" />
                <span>
                  <strong className="text-white">AI CCTV detection (YOLOv8):</strong> Continuous automated monitoring using YOLOv8 models to identify overflowing bins and dumping in real time.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 flex h-2 w-2 flex-shrink-0 rounded-full bg-white" />
                <span>
                  <strong className="text-white">Community & authority sync:</strong> Instant dispatching, smart heatmaps, and citizen rewards turning civic cleanups into active engagement.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-12 sm:mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-[#964b28]">Key Capabilities</p>
            <h3 className="mt-1 text-2xl sm:text-3xl font-black text-[#241c15]">
              How SafaiSathi Powers Modern Cities
            </h3>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'AI Detection Engine (YOLOv8)',
                copy: 'Processes existing CCTV streams to spot litter and dumping in real-time with high-precision computer vision.',
                icon: Camera,
                tone: 'bg-[#f0e2d8] text-[#8a4220]',
              },
              {
                title: 'Instant Alerts & Notifications',
                copy: 'Instant notifications to city authorities and field workers the moment waste or overflowing bins are detected.',
                icon: BellRing,
                tone: 'bg-[#e8e2d4] text-[#594d3b]',
              },
              {
                title: 'Cloud-Based Dashboard',
                copy: 'Aggregates incidents, maps active hotspots in real time, and tracks operational cleanup response times.',
                icon: BarChart3,
                tone: 'bg-[#eddcd2] text-[#964b28]',
              },
              {
                title: 'Gamified Citizen Platform',
                copy: 'Residents report waste, verify cleanups, and earn rewards — making urban cleanliness collaborative.',
                icon: Trophy,
                tone: 'bg-[#f0e2d8] text-[#8a4220]',
              },
              {
                title: 'Community Leaderboards',
                copy: 'Community leaderboards and rewards system turning civic duty into an engaging and motivating competition.',
                icon: Sparkles,
                tone: 'bg-[#e8e2d4] text-[#594d3b]',
              },
              {
                title: 'Enterprise-Grade Security',
                copy: 'Role-based access control ensuring field staff, officials, and citizens access verified, secure data.',
                icon: ShieldCheck,
                tone: 'bg-[#ebe4d8] text-[#4a3f32]',
              },
            ].map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-[#e8ded2] bg-white/90 p-5 sm:p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`inline-flex rounded-lg p-2.5 ${feature.tone}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h4 className="mt-3.5 text-base sm:text-lg font-bold text-[#241c15]">{feature.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#594d3f]">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
