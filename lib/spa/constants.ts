/**
 * SPA bounded context — costanti di dominio.
 */

export const ZONE_CORPO = [
  'testa', 'viso', 'collo', 'spalle', 'schiena', 'petto', 'addome',
  'fianchi', 'mani', 'braccia', 'avambracci', 'gambe', 'piedi', 'caviglie',
] as const;

export type ZonaCorpo = (typeof ZONE_CORPO)[number];

export const CONDIZIONI_SALUTE = [
  'pressione_alta', 'pressione_bassa', 'problemi_cardiaci', 'diabete',
  'epilessia', 'problemi_circolatori', 'ernia_disco', 'artrite',
  'problemi_cutanei', 'operazioni_recenti', 'altro',
] as const;

export type CondizioneSalute = (typeof CONDIZIONI_SALUTE)[number];

export const ALLERGIE_COMUNI = ['lattice', 'oli_essenziali', 'profumi', 'nichel', 'altro'] as const;

export type AllergiaComune = (typeof ALLERGIE_COMUNI)[number];

export const METODI_PAGAMENTO_SPA = ['CAMERA_CREDIT', 'CONTANTI', 'CARTA', 'TRANSFERWISE', 'GIFT_CARD'] as const;
export type MetodoPagamentoSpa = (typeof METODI_PAGAMENTO_SPA)[number];

export const STATI_PAGAMENTO_SPA = ['PENDENTE', 'RISCOSSO', 'RIMBORSO_RICHIESTO', 'RIMBORSATO'] as const;
export type StatoPagamentoSpa = (typeof STATI_PAGAMENTO_SPA)[number];

export const TIPI_IMPORTO_SPA = ['TRATTAMENTO', 'PERCORSO', 'PERSONALIZZATO'] as const;
export type TipoImportoSpa = (typeof TIPI_IMPORTO_SPA)[number];
