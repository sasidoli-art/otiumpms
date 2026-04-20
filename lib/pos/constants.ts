/**
 * POS / Cassa bounded context — costanti di dominio.
 */

export const METODI_PAGAMENTO_POS = [
  'CONTANTI',
  'CARTA',
  'BONIFICO',
  'CAMERA_CREDIT',
  'GIFT_CARD',
] as const;

export type MetodoPagamentoPOS = (typeof METODI_PAGAMENTO_POS)[number];

export const CATEGORIE_VOCE_POS = [
  'TRATTAMENTO_SPA',
  'PRODOTTO',
  'GIFT_CARD',
  'SERVIZIO',
  'EXTRA',
  'RISTORAZIONE',
] as const;

export type CategoriaVocePOS = (typeof CATEGORIE_VOCE_POS)[number];
