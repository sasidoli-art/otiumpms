import { Search, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('errors')
  const tc = await getTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="text-6xl font-black text-gray-200 mb-2 tracking-tight">404</div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {t('notFound')}
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          {t('notFoundDescription')}
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            {t('backToHome')}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {tc('back')}
          </Link>
        </div>
      </div>
    </div>
  )
}
