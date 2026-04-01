'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, BookOpen, Building2, CalendarDays, Users, Sparkles,
  Waves, CreditCard, Settings, ChevronDown, ChevronRight,
  ExternalLink, Lightbulb, Rocket, HelpCircle, Mail,
  Shield, Bot, FileText, BarChart3, Wrench, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<string, any> = {
  Rocket, BookOpen, Building2, CalendarDays, Users, Sparkles,
  Waves, CreditCard, Settings, Shield, Bot, FileText,
  BarChart3, Wrench, MessageSquare, Mail,
}

export function HelpCenter() {
  const t = useTranslations('help')
  const [query, setQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Build categories from translations
  const categories = useMemo(() => {
    const cats = t.raw('categories') as Record<string, {
      title: string
      icon: string
      description: string
      articles: Record<string, { title: string; content: string; link?: string }>
    }>

    return Object.entries(cats).map(([key, cat]) => ({
      key,
      title: cat.title,
      icon: cat.icon,
      description: cat.description,
      articles: Object.entries(cat.articles).map(([artKey, art]) => ({
        key: `${key}.${artKey}`,
        title: art.title,
        content: art.content,
        link: art.link,
      })),
    }))
  }, [t])

  const faqs = useMemo(() => {
    const raw = t.raw('faq') as Record<string, { q: string; a: string }>
    return Object.entries(raw).map(([key, item]) => ({
      key,
      question: item.q,
      answer: item.a,
    }))
  }, [t])

  // Search filter
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories
    const q = query.toLowerCase()
    return categories
      .map(cat => ({
        ...cat,
        articles: cat.articles.filter(
          a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
        ),
      }))
      .filter(cat =>
        cat.title.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.articles.length > 0
      )
  }, [categories, query])

  const filteredFaqs = useMemo(() => {
    if (!query.trim()) return faqs
    const q = query.toLowerCase()
    return faqs.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
  }, [faqs, query])

  const totalArticles = categories.reduce((sum, c) => sum + c.articles.length, 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-slate-500">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveCategory(null) }}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors text-sm"
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
          <p className="text-xs text-slate-500">{t('stats.categories')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalArticles}</p>
          <p className="text-xs text-slate-500">{t('stats.articles')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{faqs.length}</p>
          <p className="text-xs text-slate-500">{t('stats.faq')}</p>
        </div>
      </div>

      {/* Category grid */}
      {!activeCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {filteredCategories.map(cat => {
            const Icon = ICONS[cat.icon] ?? BookOpen
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <ChevronRight size={14} className="text-slate-300 ml-auto group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{cat.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                <p className="text-[10px] text-slate-400 mt-2">{cat.articles.length} {t('stats.articles').toLowerCase()}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Category detail view */}
      {activeCategory && (
        <div className="mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-1"
          >
            ← {t('backToCategories')}
          </button>

          {(() => {
            const cat = filteredCategories.find(c => c.key === activeCategory)
            if (!cat) return null
            const Icon = ICONS[cat.icon] ?? BookOpen
            return (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{cat.title}</h2>
                    <p className="text-sm text-slate-500">{cat.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {cat.articles.map(art => (
                    <div
                      key={art.key}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
                    >
                      <div className="flex items-start gap-3">
                        <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-2">{art.title}</h4>
                          <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                            {art.content}
                          </div>
                          {art.link && (
                            <Link
                              href={art.link}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-3"
                            >
                              {t('goToSection')} <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* FAQ Section */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle size={20} className="text-purple-500" />
          {t('faqTitle')}
        </h2>

        <div className="space-y-2">
          {filteredFaqs.map(faq => (
            <div
              key={faq.key}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === faq.key ? null : faq.key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-slate-900 dark:text-white pr-4">{faq.question}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    'text-slate-400 shrink-0 transition-transform duration-200',
                    openFaq === faq.key && 'rotate-180'
                  )}
                />
              </button>
              {openFaq === faq.key && (
                <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact support */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 text-center">
        <Mail size={24} className="text-blue-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t('contact.title')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('contact.subtitle')}</p>
        <a
          href="mailto:supporto@otiumweek.it"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Mail size={14} />
          {t('contact.button')}
        </a>
      </div>
    </div>
  )
}
