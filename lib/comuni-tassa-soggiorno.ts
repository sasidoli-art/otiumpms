/**
 * Tassa di Soggiorno (Lodging Tax) mapping for Italian municipalities 2024-2026
 * Base rates and high season rates (€ per night, per person)
 * 
 * Sources: ISTAT, municipal websites, regional tourism boards
 * Note: These are baseline estimates; verify with municipality websites for current rates
 */

export interface ComuneTassaSoggiorno {
  comune: string
  provincia: string
  provincia_code: string
  base_rate: number
  high_season_rate: number
  note?: string
}

export const COMUNI_TASSA_SOGGIORNO: Record<string, ComuneTassaSoggiorno> = {
  // Northern Italy
  'venezia': { comune: 'Venezia', provincia: 'Veneto', provincia_code: 'VE', base_rate: 4.0, high_season_rate: 10.0, note: '4-tier seasonal' },
  'milano': { comune: 'Milano', provincia: 'Lombardia', provincia_code: 'MI', base_rate: 2.5, high_season_rate: 4.0, note: 'Category-dependent' },
  'verona': { comune: 'Verona', provincia: 'Veneto', provincia_code: 'VR', base_rate: 1.5, high_season_rate: 2.5 },
  'padova': { comune: 'Padova', provincia: 'Veneto', provincia_code: 'PD', base_rate: 1.5, high_season_rate: 2.5 },
  'bologna': { comune: 'Bologna', provincia: 'Emilia-Romagna', provincia_code: 'BO', base_rate: 2.0, high_season_rate: 4.0 },
  'ravenna': { comune: 'Ravenna', provincia: 'Emilia-Romagna', provincia_code: 'RA', base_rate: 1.5, high_season_rate: 2.5 },
  'modena': { comune: 'Modena', provincia: 'Emilia-Romagna', provincia_code: 'MO', base_rate: 1.5, high_season_rate: 2.5 },
  'parma': { comune: 'Parma', provincia: 'Emilia-Romagna', provincia_code: 'PR', base_rate: 1.0, high_season_rate: 2.0 },
  'bergamo': { comune: 'Bergamo', provincia: 'Lombardia', provincia_code: 'BG', base_rate: 1.5, high_season_rate: 2.5 },
  'brescia': { comune: 'Brescia', provincia: 'Lombardia', provincia_code: 'BS', base_rate: 1.0, high_season_rate: 2.0 },
  'como': { comune: 'Como', provincia: 'Lombardia', provincia_code: 'CO', base_rate: 1.5, high_season_rate: 3.0 },
  'trento': { comune: 'Trento', provincia: 'Trentino-Alto Adige', provincia_code: 'TN', base_rate: 2.0, high_season_rate: 4.0, note: 'Winter peaks higher' },
  'bolzano': { comune: 'Bolzano', provincia: 'Trentino-Alto Adige', provincia_code: 'BZ', base_rate: 2.0, high_season_rate: 4.0 },
  'merano': { comune: 'Merano', provincia: 'Trentino-Alto Adige', provincia_code: 'BZ', base_rate: 1.75, high_season_rate: 3.5, note: 'Spa destination' },
  'jesolo': { comune: 'Jesolo', provincia: 'Veneto', provincia_code: 'VE', base_rate: 1.5, high_season_rate: 3.5 },
  'bibione': { comune: 'Bibione', provincia: 'Veneto', provincia_code: 'VE', base_rate: 1.5, high_season_rate: 3.5 },
  'rimini': { comune: 'Rimini', provincia: 'Emilia-Romagna', provincia_code: 'RN', base_rate: 1.5, high_season_rate: 3.5 },
  'riccione': { comune: 'Riccione', provincia: 'Emilia-Romagna', provincia_code: 'RN', base_rate: 1.5, high_season_rate: 3.5 },

  // Central Italy
  'firenze': { comune: 'Firenze', provincia: 'Toscana', provincia_code: 'FI', base_rate: 2.5, high_season_rate: 5.0 },
  'roma': { comune: 'Roma', provincia: 'Lazio', provincia_code: 'RM', base_rate: 2.0, high_season_rate: 5.0, note: 'Up to €7.50 for luxury' },
  'siena': { comune: 'Siena', provincia: 'Toscana', provincia_code: 'SI', base_rate: 2.0, high_season_rate: 3.5, note: 'Palio season' },
  'pisa': { comune: 'Pisa', provincia: 'Toscana', provincia_code: 'PI', base_rate: 1.5, high_season_rate: 2.5 },
  'lucca': { comune: 'Lucca', provincia: 'Toscana', provincia_code: 'LU', base_rate: 1.0, high_season_rate: 2.5 },
  'montepulciano': { comune: 'Montepulciano', provincia: 'Toscana', provincia_code: 'SI', base_rate: 1.5, high_season_rate: 2.5, note: 'Wine region' },
  'san gimignano': { comune: 'San Gimignano', provincia: 'Toscana', provincia_code: 'SI', base_rate: 1.75, high_season_rate: 3.5 },
  'volterra': { comune: 'Volterra', provincia: 'Toscana', provincia_code: 'PI', base_rate: 1.5, high_season_rate: 2.5 },
  'arezzo': { comune: 'Arezzo', provincia: 'Toscana', provincia_code: 'AR', base_rate: 1.0, high_season_rate: 2.0 },
  'cortona': { comune: 'Cortona', provincia: 'Toscana', provincia_code: 'AR', base_rate: 1.5, high_season_rate: 2.5 },
  'perugia': { comune: 'Perugia', provincia: 'Umbria', provincia_code: 'PG', base_rate: 1.0, high_season_rate: 2.5 },
  'assisi': { comune: 'Assisi', provincia: 'Umbria', provincia_code: 'PG', base_rate: 2.0, high_season_rate: 3.5, note: 'Pilgrimage site' },
  'gubbio': { comune: 'Gubbio', provincia: 'Umbria', provincia_code: 'PG', base_rate: 1.25, high_season_rate: 2.5 },
  'ancona': { comune: 'Ancona', provincia: 'Marche', provincia_code: 'AN', base_rate: 1.0, high_season_rate: 2.0 },
  'civitanova marche': { comune: 'Civitanova Marche', provincia: 'Marche', provincia_code: 'MC', base_rate: 1.5, high_season_rate: 2.5 },
  "l'aquila": { comune: "L'Aquila", provincia: 'Abruzzo', provincia_code: 'AQ', base_rate: 0.75, high_season_rate: 1.5 },
  'teramo': { comune: 'Teramo', provincia: 'Abruzzo', provincia_code: 'TE', base_rate: 0.75, high_season_rate: 1.5 },

  // Tuscany Beach & Wine
  'livorno': { comune: 'Livorno', provincia: 'Toscana', provincia_code: 'LI', base_rate: 1.5, high_season_rate: 2.5 },
  'castiglione della pescaia': { comune: 'Castiglione della Pescaia', provincia: 'Toscana', provincia_code: 'GR', base_rate: 2.0, high_season_rate: 4.0 },
  'follonica': { comune: 'Follonica', provincia: 'Toscana', provincia_code: 'GR', base_rate: 1.5, high_season_rate: 3.0 },
  'portoferraio': { comune: 'Portoferraio', provincia: 'Toscana', provincia_code: 'LI', base_rate: 2.0, high_season_rate: 3.5, note: 'Island' },

  // Southern Italy & Islands
  'napoli': { comune: 'Napoli', provincia: 'Campania', provincia_code: 'NA', base_rate: 1.0, high_season_rate: 2.5 },
  'capri': { comune: 'Capri', provincia: 'Campania', provincia_code: 'NA', base_rate: 3.0, high_season_rate: 5.0, note: 'Premium island' },
  'positano': { comune: 'Positano', provincia: 'Campania', provincia_code: 'SA', base_rate: 2.5, high_season_rate: 4.5, note: 'Amalfi Coast' },
  'amalfi': { comune: 'Amalfi', provincia: 'Campania', provincia_code: 'SA', base_rate: 2.0, high_season_rate: 3.5, note: 'Coast hub' },
  'ravello': { comune: 'Ravello', provincia: 'Campania', provincia_code: 'SA', base_rate: 1.75, high_season_rate: 3.0 },
  'salerno': { comune: 'Salerno', provincia: 'Campania', provincia_code: 'SA', base_rate: 1.0, high_season_rate: 2.0 },
  'lecce': { comune: 'Lecce', provincia: 'Puglia', provincia_code: 'LE', base_rate: 1.5, high_season_rate: 2.5, note: 'Baroque' },
  'otranto': { comune: 'Otranto', provincia: 'Puglia', provincia_code: 'LE', base_rate: 1.5, high_season_rate: 2.5 },
  'bari': { comune: 'Bari', provincia: 'Puglia', provincia_code: 'BA', base_rate: 1.0, high_season_rate: 2.0 },
  'monopoli': { comune: 'Monopoli', provincia: 'Puglia', provincia_code: 'BA', base_rate: 1.5, high_season_rate: 2.5 },
  'polignano a mare': { comune: 'Polignano a Mare', provincia: 'Puglia', provincia_code: 'BA', base_rate: 1.5, high_season_rate: 2.5 },
  'catania': { comune: 'Catania', provincia: 'Sicilia', provincia_code: 'CT', base_rate: 1.0, high_season_rate: 2.5 },
  'palermo': { comune: 'Palermo', provincia: 'Sicilia', provincia_code: 'PA', base_rate: 1.5, high_season_rate: 2.5 },
  'mondello': { comune: 'Mondello', provincia: 'Sicilia', provincia_code: 'PA', base_rate: 1.5, high_season_rate: 3.0 },
  'taormina': { comune: 'Taormina', provincia: 'Sicilia', provincia_code: 'ME', base_rate: 2.5, high_season_rate: 4.5, note: 'Sicilian Riviera' },
  'cefalù': { comune: 'Cefalù', provincia: 'Sicilia', provincia_code: 'PA', base_rate: 1.75, high_season_rate: 3.5 },
  'trapani': { comune: 'Trapani', provincia: 'Sicilia', provincia_code: 'TP', base_rate: 1.0, high_season_rate: 2.5 },
  'agrigento': { comune: 'Agrigento', provincia: 'Sicilia', provincia_code: 'AG', base_rate: 1.5, high_season_rate: 3.0, note: 'Ancient temples' },
  'ragusa': { comune: 'Ragusa', provincia: 'Sicilia', provincia_code: 'RG', base_rate: 1.5, high_season_rate: 2.5, note: 'Val di Noto' },

  // Lakes & Mountains
  'gargnano': { comune: 'Gargnano', provincia: 'Lombardia', provincia_code: 'BS', base_rate: 1.5, high_season_rate: 2.5, note: 'Lake Garda' },
  'riva del garda': { comune: 'Riva del Garda', provincia: 'Trentino-Alto Adige', provincia_code: 'TN', base_rate: 2.0, high_season_rate: 3.5 },
  'limone sul garda': { comune: 'Limone sul Garda', provincia: 'Lombardia', provincia_code: 'BS', base_rate: 1.5, high_season_rate: 2.5 },
  'bardolino': { comune: 'Bardolino', provincia: 'Veneto', provincia_code: 'VR', base_rate: 1.0, high_season_rate: 2.5 },
  'sirmione': { comune: 'Sirmione', provincia: 'Lombardia', provincia_code: 'BS', base_rate: 2.0, high_season_rate: 3.5, note: 'Thermal' },
  'varenna': { comune: 'Varenna', provincia: 'Lombardia', provincia_code: 'LC', base_rate: 2.0, high_season_rate: 3.5, note: 'Lake Como' },
  'bellagio': { comune: 'Bellagio', provincia: 'Lombardia', provincia_code: 'CO', base_rate: 2.5, high_season_rate: 4.5 },
  'menaggio': { comune: 'Menaggio', provincia: 'Lombardia', provincia_code: 'CO', base_rate: 1.5, high_season_rate: 3.0 },
  'orta san giulio': { comune: 'Orta San Giulio', provincia: 'Piemonte', provincia_code: 'NO', base_rate: 2.0, high_season_rate: 3.5 },
}

/**
 * Get tassa di soggiorno base rate by comune name (lowercase)
 * @param comuneNome - Municipality name (will be lowercased)
 * @returns base rate or null if not found
 */
export function getTassaSoggiornoBase(comuneNome?: string): number | null {
  if (!comuneNome) return null
  const key = comuneNome.toLowerCase().trim()
  return COMUNI_TASSA_SOGGIORNO[key]?.base_rate ?? null
}

/**
 * Get tassa di soggiorno high season rate by comune name (lowercase)
 * @param comuneNome - Municipality name (will be lowercased)
 * @returns high season rate or null if not found
 */
export function getTassaSoggiornoAlta(comuneNome?: string): number | null {
  if (!comuneNome) return null
  const key = comuneNome.toLowerCase().trim()
  return COMUNI_TASSA_SOGGIORNO[key]?.high_season_rate ?? null
}

/**
 * Check if a date falls within high season (June-August, Dec-Mar for mountains)
 * @param data - Date to check
 * @param tipo - 'standard' (Jun-Aug) or 'mountain' (Dec-Mar, Jun-Aug)
 */
export function isAltaStagione(data: Date, tipo: 'standard' | 'mountain' = 'standard'): boolean {
  const mese = data.getMonth() + 1
  if (tipo === 'mountain') {
    return mese >= 6 && mese <= 8 || mese >= 12 || mese <= 3
  }
  return mese >= 6 && mese <= 8
}

/**
 * Calculate suggested tassa di soggiorno rate for given dates
 * @param comuneNome - Municipality name
 * @param dataArrivo - Check-in date
 * @param dataPartenza - Check-out date
 * @param tipo - 'standard' or 'mountain'
 * @returns suggested rate or null if comune not found
 */
export function calcolaTassaSuggerita(
  comuneNome?: string,
  dataArrivo?: Date,
  dataPartenza?: Date,
  tipo: 'standard' | 'mountain' = 'standard'
): number | null {
  if (!comuneNome) return null
  
  const baseRate = getTassaSoggiornoBase(comuneNome)
  if (baseRate === null) return null

  // If we have dates, average between base + high season based on night distribution
  if (dataArrivo && dataPartenza) {
    const altaRate = getTassaSoggiornoAlta(comuneNome) ?? baseRate
    let notesAlta = 0
    let notesTotali = 0

    let data = new Date(dataArrivo)
    while (data < dataPartenza) {
      notesTotali++
      if (isAltaStagione(data, tipo)) {
        notesAlta++
      }
      data.setDate(data.getDate() + 1)
    }

    if (notesTotali === 0) return baseRate
    const pctAlta = notesAlta / notesTotali
    return baseRate * (1 - pctAlta) + altaRate * pctAlta
  }

  return baseRate
}
