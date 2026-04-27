import type { ReactNode } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, Instagram, Facebook } from 'lucide-react'
import type { StrutturaPubblica } from '@/lib/book/get-struttura-pubblica'
import { getBrandTheme, brandThemeToCssVars } from '@/lib/branding'
import BookingHeader from './booking-header'

type Props = {
  struttura: StrutturaPubblica
  children: ReactNode
  /** Se true, mostra l'hero con fotoHero (solo sulla landing). */
  hero?: boolean
  /** CTA renderizzati sopra al hero (es. "Prenota una camera" sulla landing). */
  heroActions?: ReactNode
}

/**
 * Layout shell per tutte le pagine pubbliche /book/[strutturaId]/*.
 * White-label completo: l'ospite vede solo il brand della struttura.
 *
 * Struttura:
 *   1. Header sticky glassmorphism (client: scroll-aware)
 *   2. Hero full-width 50vh (opzionale, solo su landing con fotoHero)
 *   3. Main content (children)
 *   4. Footer dark (neutral-900) con info + social + legal
 *
 * Branding dinamico via CSS custom properties iniettate nel root
 * (--brand-primary, --brand-on-primary, --brand-radius, --brand-font).
 */
export default function BookingLayout({ struttura, children, hero, heroActions }: Props) {
  const theme = getBrandTheme(struttura)
  const cssVars = brandThemeToCssVars(theme)
  const anno = new Date().getFullYear()
  const showHero = !!(hero && struttura.fotoHero)

  return (
    <div
      data-public-booking="true"
      className="min-h-screen flex flex-col bg-neutral-50"
      style={{ ...cssVars, fontFamily: 'var(--brand-font)' } as React.CSSProperties}
    >
      {/* ═══ HEADER (sticky glass, scroll-aware) ═══════════════════════════ */}
      <BookingHeader struttura={struttura} transparentOnTop={showHero} />

      {/* ═══ HERO — only on landing with fotoHero ══════════════════════════ */}
      {showHero ? (
        <section
          className="relative -mt-16 w-full overflow-hidden"
          style={{ height: 'min(50vh, 500px)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={struttura.fotoHero!}
            alt={struttura.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlay: transparent in alto → scuro in basso */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />

          <div className="relative h-full flex items-end">
            <div className="max-w-6xl mx-auto w-full px-4 md:px-6 pb-10 md:pb-14 text-white">
              <h1 className="font-serif text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.02em] drop-shadow-lg">
                {struttura.nome}
              </h1>
              {struttura.descrizione && (
                <p className="mt-3 text-[16px] md:text-[18px] leading-relaxed max-w-2xl opacity-90 drop-shadow">
                  {struttura.descrizione}
                </p>
              )}
              {heroActions && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3 flex-wrap">
                  {heroActions}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        !hero ? null : (
          // Fallback quando `hero=true` ma NESSUNA fotoHero: header delicato, niente placeholder.
          <section className="bg-gradient-to-b from-primary-50/60 to-white border-b border-neutral-150">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 text-center">
              <h1 className="font-serif text-[28px] md:text-[32px] text-neutral-900 leading-tight tracking-[-0.02em]">
                {struttura.nome}
              </h1>
              {struttura.descrizione && (
                <p className="mt-3 text-[16px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                  {struttura.descrizione}
                </p>
              )}
              {heroActions && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                  {heroActions}
                </div>
              )}
            </div>
          </section>
        )
      )}

      {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-8 md:py-12">
        {children}
      </main>

      {/* ═══ FOOTER (dark) ═════════════════════════════════════════════════ */}
      <footer className="bg-neutral-900 text-neutral-400 mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Col 1 — struttura + contatti */}
            <div>
              <h3 className="font-serif text-[18px] text-white mb-3">
                {struttura.nome}
              </h3>
              <div className="space-y-2 text-[13px]">
                {struttura.indirizzo && (
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />
                    <span>
                      {struttura.indirizzo}
                      {struttura.citta ? `, ${struttura.citta}` : ''}
                    </span>
                  </p>
                )}
                {struttura.telefonoHost && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 opacity-60" />
                    <a href={`tel:${struttura.telefonoHost}`} className="hover:text-white transition-colors">
                      {struttura.telefonoHost}
                    </a>
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 opacity-60" />
                  <a href={`mailto:${struttura.emailHost}`} className="hover:text-white transition-colors break-all">
                    {struttura.emailHost}
                  </a>
                </p>
              </div>
            </div>

            {/* Col 2 — social */}
            <div>
              <h3 className="font-semibold text-[13px] text-white uppercase tracking-[0.02em] mb-3">
                Seguici
              </h3>
              <div className="flex items-center gap-4">
                {struttura.linkSitoWeb && (
                  <a
                    href={struttura.linkSitoWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Sito web"
                    className="opacity-60 hover:opacity-100 hover:text-white transition-all"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {struttura.linkFacebook && (
                  <a
                    href={struttura.linkFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="opacity-60 hover:opacity-100 hover:text-white transition-all"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {struttura.linkInstagram && (
                  <a
                    href={struttura.linkInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="opacity-60 hover:opacity-100 hover:text-white transition-all"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </div>
              {struttura.linkSitoWeb && (
                <p className="mt-3 text-[12px] opacity-70">
                  {struttura.linkSitoWeb.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </p>
              )}
            </div>

            {/* Col 3 — privacy */}
            <div>
              <h3 className="font-semibold text-[13px] text-white uppercase tracking-[0.02em] mb-3">
                Privacy
              </h3>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors">
                    Informativa privacy
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="hover:text-white transition-colors">
                    Cookie policy
                  </Link>
                </li>
                <li className="pt-1">
                  <p className="text-[12px] opacity-70 leading-relaxed">
                    Hai una prenotazione? Riceverai via email un link per gestire i tuoi dati.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {struttura.messaggioChiusura && (
            <p className="mt-10 pt-8 border-t border-neutral-800 text-center italic text-[14px] text-neutral-300 max-w-2xl mx-auto">
              &ldquo;{struttura.messaggioChiusura}&rdquo;
            </p>
          )}

          <p className="mt-8 text-center text-[12px] text-neutral-500">
            © {anno} {struttura.nomeAzienda}
          </p>
        </div>
      </footer>
    </div>
  )
}
