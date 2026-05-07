/**
 * lib/errors.ts — Custom API errors con statusCode integrato.
 * Usati da apiHandler() per rispondere con JSON strutturato.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Risorsa non trovata') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflitto con una risorsa esistente') {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class ValidationError extends ApiError {
  constructor(
    message = 'Dati non validi',
    public readonly details?: unknown,
  ) {
    super(message, 422, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Accesso non autorizzato') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Autenticazione richiesta') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message = 'Troppi tentativi. Riprova tra un po.') {
    super(message, 429, 'RATE_LIMITED')
    this.name = 'TooManyRequestsError'
  }
}
