/**
 * SPA bounded context — schemi di validazione Zod.
 */

import { z } from 'zod';
import {
  ZONE_CORPO,
  CONDIZIONI_SALUTE,
  ALLERGIE_COMUNI,
  METODI_PAGAMENTO_SPA,
  TIPI_IMPORTO_SPA,
} from './constants';

export const waiverSpaSchema = z.object({
  appuntamentoId: z.string().cuid('ID appuntamento non valido'),
  firmaBase64: z.string().optional().nullable(),

  // Zone corpo
  zoneTrattate: z.array(z.enum(ZONE_CORPO)).default([]).optional(),
  zoneEvitare: z.array(z.enum(ZONE_CORPO)).default([]).optional(),

  // Condizioni di salute
  incinta: z.boolean().default(false),
  incintaMesi: z.number().min(1).max(9).optional().nullable(),
  condizioni: z.array(z.enum(CONDIZIONI_SALUTE)).default([]).optional(),
  condizioneAltro: z.string().max(300).trim().optional().nullable(),

  // Allergie
  allergieSelezionate: z.array(z.enum(ALLERGIE_COMUNI)).default([]).optional(),
  allergieAltro: z.string().max(300).trim().optional().nullable(),

  // Legacy (retrocompatibilità)
  allergie: z.string().max(500).trim().optional().nullable(),
  patologie: z.string().max(500).trim().optional().nullable(),
  farmaci: z.string().max(500).trim().optional().nullable(),

  // Preferenze
  pressioneMassaggio: z.enum(['leggera', 'media', 'forte']).optional().nullable(),
  temperaturaPreferita: z.enum(['freddo', 'tiepido', 'caldo']).optional().nullable(),
  musicaPreferita: z.enum(['si', 'no', 'indifferente']).optional().nullable(),
  aromiPreferiti: z.enum(['si', 'senza']).optional().nullable(),
  notePreferenze: z.string().max(500).trim().optional().nullable(),

  // Accettazione
  accettazioneTermini: z.boolean().refine((v) => v === true, 'Devi accettare i termini e le condizioni'),
  accettazionePrivacy: z.boolean().refine((v) => v === true, 'Devi accettare la privacy policy'),
  consensoFoto: z.boolean().default(false),
  dichiarazioneNessuna: z.boolean().default(false),
});

export type WaiverSpaInput = z.infer<typeof waiverSpaSchema>;

export const pagamentoSpaSchema = z.object({
  appuntamentoId: z.string().cuid('ID appuntamento non valido'),
  importo: z.number().positive('Importo deve essere positivo'),
  tipoImporto: z.enum(TIPI_IMPORTO_SPA).default('TRATTAMENTO'),
  metodo: z.enum(METODI_PAGAMENTO_SPA),
  unitaId: z.string().cuid().optional().nullable(),
  ultimeQuatroCifre: z.string().length(4).regex(/^\d{4}$/).optional().nullable(),
  noteRiscossione: z.string().max(500).optional().nullable(),
  giftCardCodice: z.string().min(1).max(40).optional().nullable(),
});

export type PagamentoSpaInput = z.infer<typeof pagamentoSpaSchema>;
