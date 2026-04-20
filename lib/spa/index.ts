/**
 * SPA bounded context — public API.
 *
 * Dominio: gestione trattamenti, percorsi benessere, waiver clinici,
 * pagamenti, calendario, terapisti, cabine, gift card, loyalty,
 * waiting list e turnaway tracking.
 *
 * Modelli Prisma coinvolti (13):
 *   TrattamentoSpa, PercorsoBenessere, TerapistaSpa, CabinaSpa,
 *   AppuntamentoSpa, DisponibilitaTerapista, WaiverSpa, PagamentoSpa,
 *   GiftCard, GiftCardMovimento, WaitingListSpa, TurnawayTracking,
 *   DotazioneCabinaSpa
 *
 * API routes: app/api/host/spa/* + app/api/spa/* + app/api/book/[id]/spa/*
 * Components: components/spa/*
 */

export * from './constants';
export * from './validations';
