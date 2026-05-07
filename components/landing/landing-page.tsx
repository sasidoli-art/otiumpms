'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import {
  Calendar,
  Sparkles,
  MessageCircle,
  FileText,
  BarChart3,
  Globe,
  Smartphone,
  Home,
  Brush,
  Check,
  ArrowRight,
  Star,
  Building2,
  BookOpen,
  ThumbsUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'

/* ───────────────────────── Navbar ───────────────────────── */
function Navbar() {
  const t = useTranslations('landing')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">OW</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Otium Week
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-slate-300 hover:text-white text-sm transition-colors">
              {t('nav.features')}
            </a>
            <a href="#pricing" className="text-slate-300 hover:text-white text-sm transition-colors">
              {t('nav.pricing')}
            </a>
            <LanguageSwitcher className="[&_button]:text-slate-300 [&_button]:hover:bg-slate-800" />
            <Link
              href="/login"
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {t('nav.login')}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-slate-800 mt-2 pt-4 space-y-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block text-slate-300 hover:text-white text-sm">
              {t('nav.features')}
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="block text-slate-300 hover:text-white text-sm">
              {t('nav.pricing')}
            </a>
            <div className="flex items-center gap-3">
              <LanguageSwitcher className="[&_button]:text-slate-300 [&_button]:hover:bg-slate-800" />
              <Link href="/login" className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {t('nav.login')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  const t = useTranslations('landing')

  return (
    <section className="relative bg-slate-900 pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-slate-900 to-slate-900" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-600/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Star size={12} />
              {t('hero.badge')}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              {t('hero.title')}
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl text-base transition-colors shadow-lg shadow-brand-600/25"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight size={18} />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl text-base transition-colors"
              >
                {t('hero.ctaSecondary')}
              </a>
            </div>
          </div>

          {/* Visual — feature icon grid */}
          <div className="hidden lg:grid grid-cols-3 gap-4">
            {[
              { icon: Calendar, label: t('hero.icons.bookings'), color: 'bg-blue-500/10 text-blue-400' },
              { icon: Users, label: t('hero.icons.crm'), color: 'bg-emerald-500/10 text-emerald-400' },
              { icon: Sparkles, label: t('hero.icons.spa'), color: 'bg-purple-500/10 text-purple-400' },
              { icon: MessageCircle, label: t('hero.icons.concierge'), color: 'bg-amber-500/10 text-amber-400' },
              { icon: FileText, label: t('hero.icons.invoicing'), color: 'bg-rose-500/10 text-rose-400' },
              { icon: BarChart3, label: t('hero.icons.analytics'), color: 'bg-cyan-500/10 text-cyan-400' },
              { icon: Brush, label: t('hero.icons.housekeeping'), color: 'bg-orange-500/10 text-orange-400' },
              { icon: Globe, label: t('hero.icons.multilang'), color: 'bg-teal-500/10 text-teal-400' },
              { icon: Smartphone, label: t('hero.icons.checkin'), color: 'bg-indigo-500/10 text-indigo-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 text-center hover:bg-slate-800/80 transition-colors"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mx-auto mb-3`}>
                  <Icon size={22} />
                </div>
                <span className="text-sm text-slate-300 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Features ───────────────────────── */
const FEATURE_ICONS = [
  Calendar, Brush, Sparkles, MessageCircle, FileText, Home, BarChart3, Globe, Smartphone,
] as const

function Features() {
  const t = useTranslations('landing')

  const features = Array.from({ length: 10 }, (_, i) => ({
    icon: FEATURE_ICONS[i],
    title: t(`features.items.${i}.title`),
    desc: t(`features.items.${i}.desc`),
  }))

  const colors = [
    'bg-blue-50 text-blue-600',
    'bg-emerald-50 text-emerald-600',
    'bg-orange-50 text-orange-600',
    'bg-purple-50 text-purple-600',
    'bg-amber-50 text-amber-600',
    'bg-rose-50 text-rose-600',
    'bg-sky-50 text-sky-600',
    'bg-cyan-50 text-cyan-600',
    'bg-teal-50 text-teal-600',
    'bg-indigo-50 text-indigo-600',
  ]

  return (
    <section id="features" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={i}
                className="group bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-6 transition-all hover:shadow-lg"
              >
                <div className={`w-12 h-12 rounded-xl ${colors[i]} flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Stats ───────────────────────── */
function Stats() {
  const t = useTranslations('landing')

  const stats = [
    { value: '100+', label: t('stats.structures'), icon: Building2 },
    { value: '10.000+', label: t('stats.bookings'), icon: BookOpen },
    { value: '98%', label: t('stats.satisfaction'), icon: ThumbsUp },
  ]

  return (
    <section className="py-16 bg-slate-50 border-y border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label}>
                <div className="flex items-center justify-center mb-3">
                  <Icon size={28} className="text-brand-500" />
                </div>
                <div className="text-4xl font-bold text-slate-900">{s.value}</div>
                <div className="mt-1 text-sm text-slate-500 font-medium">{s.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Pricing ───────────────────────── */
function Pricing() {
  const t = useTranslations('landing')

  const plans = [
    {
      name: t('pricing.plans.single.name'),
      price: '49',
      period: t('pricing.plans.single.period'),
      desc: t('pricing.plans.single.desc'),
      features: Array.from({ length: 6 }, (_, i) => t(`pricing.plans.single.features.${i}`)),
      cta: t('pricing.cta'),
      popular: false,
    },
    {
      name: t('pricing.plans.monthly.name'),
      price: '149',
      period: t('pricing.plans.monthly.period'),
      desc: t('pricing.plans.monthly.desc'),
      features: Array.from({ length: 8 }, (_, i) => t(`pricing.plans.monthly.features.${i}`)),
      cta: t('pricing.cta'),
      popular: true,
    },
    {
      name: t('pricing.plans.premium.name'),
      price: '349',
      period: t('pricing.plans.premium.period'),
      desc: t('pricing.plans.premium.desc'),
      features: Array.from({ length: 9 }, (_, i) => t(`pricing.plans.premium.features.${i}`)),
      cta: t('pricing.cta'),
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.popular
                  ? 'border-brand-500 bg-brand-50/30 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/20'
                  : 'border-slate-200 bg-white hover:shadow-lg'
              } transition-shadow`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  {t('pricing.popular')}
                </div>
              )}

              {/* Trial badge */}
              <div className="inline-flex self-start items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full mb-4">
                <Sparkles size={12} />
                {t('pricing.trial')}
              </div>

              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{plan.desc}</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-bold text-slate-900">&euro;{plan.price}</span>
                <span className="text-slate-500 text-sm ml-1">/{plan.period}</span>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check size={16} className="text-brand-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`mt-8 block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
                  plan.popular
                    ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Footer ───────────────────────── */
function Footer() {
  const t = useTranslations('landing')

  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">OW</span>
              </div>
              <span className="text-white font-semibold text-lg">Otium Week</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('footer.product')}</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">{t('nav.features')}</a></li>
              <li><a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">{t('nav.pricing')}</a></li>
              <li><Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">{t('nav.login')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2.5">
              <li><Link href="/privacy-policy" className="text-sm text-slate-400 hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">{t('footer.terms')}</Link></li>
              <li><Link href="/cookie-policy" className="text-sm text-slate-400 hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="mailto:info@otiumweek.it" className="text-sm text-slate-400 hover:text-white transition-colors">
                  info@otiumweek.it
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Otium Week. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ───────────────────────── Main ───────────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Pricing />
      <Footer />
    </div>
  )
}
