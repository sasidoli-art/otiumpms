/**
 * POS / Cassa bounded context — public API.
 *
 * Dominio: punto vendita SPA/ristorazione, transazioni con voci,
 * chiusura cassa giornaliera, incassi per metodo, riconciliazione.
 *
 * Modelli Prisma coinvolti (5):
 *   TransazionePOS, VocePOS, ChiusuraCassa, Incasso, GiftCard/Movimento
 *
 * API routes: app/api/host/pos/* + app/api/host/cassa/*
 */

export * from './constants';
