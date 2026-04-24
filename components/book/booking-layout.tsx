import type { ReactNode } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe } from 'lucide-react'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import type { StrutturaPubblica } from '@/lib/book/get-struttura-pubblica'
import { getBrandTheme, brandThemeToCssVars } from '@/lib/branding'
import BookingNavTabs from './booking-nav-tabs'

type Props = {
  struttura: StrutturaPubblica
  children: ReactNode
  /** Se true, mostra l'hero con fotoHero (solo sulla landing) */
  hero?: boolean
}

/**
 * Layout condiviso per tutte le pagine pubbliche /book/[strutturaId]/*.
 * White-label completo: l'ospite vede solo il brand della struttura.
 *
 * Branding dinamico via CSS custom properties iniettate nel root
 * (--brand-primary, --brand-secondary, --brand-on-primary, --brand-radius, …).
 * I componenti figli li consumano con `style={{ background: 'var(--brand-primary)' }}`.
 */
export default function BookingLayout({ struttura, children, hero }: Props) {
  const theme = getBrandTheme(struttura)
  const cssVars = brandThemeToCssVars(theme)
  const anno = new Date().getFullYear()

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-50"
      style={{ ...cssVars, fontFamily: 'var(--brand-font)' } as React.CSSProperties}
    >
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo / nome struttura */}
            <Link
              href={`/book/${struttura.id}`}
              className="flex items-center gap-3 min-w-0 flex-shrink-0"
            >
              {struttura.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={struttura.logo}
                  alt={struttura.nome}
                  className="h-8 md:h-10 w-auto max-w-[140px] md:max-w-[180px] object-contain"
                />
              ) : (
                <div
                  className="w-10 h-10 flex items-center justify-center font-bold text-lg"
                  style={{
                    backgroundColor: 'var(--brand-primary)',
                    color: 'var(--brand-on-primary)',
                    borderRadius: 'var(--brand-radius)',
                  }}
                >
                  {struttura.nome.charAt(0)}
                </div>
              )}
              <div className="hidden sm:block min-w-0">
                <p className="text-sm md:text-base font-semibold text-gray-900 truncate">
                  {struttura.nome}
                </p>
                {struttura.citta && (
                  <p className="text-[11px] text-gray-500 truncate">{struttura.citta}</p>
                )}
              </div>
            </Link>

            {/* Nav: tab moduli attivi (desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              <BookingNavTabs struttura={struttura} />
            </nav>

            {/* Language switcher */}
            <div className="shrink-0">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Nav mobile (pills sotto, solo se >1 modulo) */}
          <div className="md:hidden mt-3 overflow-x-auto -mx-4 px-4 flex gap-1.5 pb-1">
            <BookingNavTabs struttura={struttura} />
          </div>
        </div>
      </header>

      {/* ─── Hero (solo landing) ──────────────────────────────────────── */}
      {hero && struttura.fotoHero && (
        <section className="relative h-[280px] md:h-[360px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={struttura.fotoHero}
            alt={struttura.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-6xl mx-auto px-4 pb-8 md:pb-12 text-white w-full">
              <h1 className="text-3xl md:text-5xl font-bold drop-shadow-lg">
                {struttura.nome}
              </h1>
              {struttura.descrizione && (
                <p className="mt-2 text-sm md:text-base max-w-2xl opacity-90 drop-shadow">
                  {struttura.descrizione}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-10">{children}</main>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Colonna 1 — info struttura */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{struttura.nome}</h3>
              {struttura.indirizzo && (
                <p className="text-xs text-gray-500 flex items-start gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {struttura.indirizzo}
                    {struttura.citta ? `, ${struttura.citta}` : ''}
                  </span>
                </p>
              )}
              {struttura.telefonoHost && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${struttura.telefonoHost}`} className="hover:text-gray-900">
                    {struttura.telefonoHost}
                  </a>
                </p>
              )}
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${struttura.emailHost}`} className="hover:text-gray-900">
                  {struttura.emailHost}
                </a>
              </p>
            </div>

            {/* Colonna 2 — social */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Seguici</h3>
              <div className="flex flex-wrap gap-3 text-xs">
                {struttura.linkSitoWeb && (
                  <a
                    href={struttura.linkSitoWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {struttura.linkSitoWeb.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {struttura.linkFacebook && (
                  <a
                    href={struttura.linkFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-900"
                  >
                    Facebook
                  </a>
                )}
                {struttura.linkInstagram && (
                  <a
                    href={struttura.linkInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-900"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>

            {/* Colonna 3 — legale / privacy */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Privacy</h3>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/privacy-policy" className="text-gray-500 hover:text-gray-900">
                    Informativa privacy
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="text-gray-500 hover:text-gray-900">
                    Cookie policy
                  </Link>
                </li>
                <li>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Hai una prenotazione? Riceverai via email un link personale per
                    gestire i tuoi dati.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {struttura.messaggioChiusura && (
            <p className="mt-8 text-center italic text-sm text-gray-500 border-t border-gray-100 pt-6">
              {struttura.messaggioChiusura}
            </p>
          )}

          <p className="mt-6 text-center text-[11px] text-gray-400">
            © {anno} {struttura.nomeAzienda}
          </p>
        </div>
      </footer>
    </div>
  )
}
