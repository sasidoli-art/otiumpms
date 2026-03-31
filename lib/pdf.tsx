import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Tipi locali per la fattura (compatibili con Prisma)
interface RigaFattura {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva: number
  totale: number
}

interface Fattura {
  numero: string
  anno: number
  dataEmissione: Date
  dataScadenza?: Date | null
  stato: string

  // Dati cliente
  clienteNome: string
  clientePIva?: string | null
  clienteCF?: string | null
  clienteIndirizzo?: string | null
  clienteCitta?: string | null
  clienteCap?: string | null
  clienteProvincia?: string | null
  clientePaese: string
  clienteEmail?: string | null
  clientePec?: string | null
  clienteSDI?: string | null

  // Economici
  righe: RigaFattura[] | unknown
  imponibile: number
  iva: number
  totale: number
  aliquotaIva: number

  note?: string | null
}

const BRAND = '#4f46e5'
const GRAY_LIGHT = '#f9fafb'
const GRAY_BORDER = '#e5e7eb'
const GRAY_TEXT = '#6b7280'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111827',
    padding: 48,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  brandBlock: { flexDirection: 'column', gap: 2 },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BRAND },
  brandSub: { fontSize: 8, color: GRAY_TEXT },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  docNumero: { fontSize: 10, color: BRAND, fontFamily: 'Helvetica-Bold' },
  docMeta: { fontSize: 8, color: GRAY_TEXT, marginTop: 2 },

  // Indirizzi
  addressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  addressBox: { width: '45%' },
  addressLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY_TEXT, textTransform: 'uppercase', marginBottom: 5, letterSpacing: 0.5 },
  addressName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  addressLine: { fontSize: 9, color: '#374151', marginBottom: 1 },

  // Tabella
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  tableRowAlt: { backgroundColor: GRAY_LIGHT },

  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colIva: { flex: 1, textAlign: 'center' },
  colTotale: { flex: 1.5, textAlign: 'right' },

  th: { fontSize: 8, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  td: { fontSize: 9, color: '#374151' },

  // Totali
  totalsBlock: {
    alignSelf: 'flex-end',
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    paddingTop: 10,
    gap: 3,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalsLabel: { fontSize: 9, color: GRAY_TEXT },
  totalsValue: { fontSize: 9, color: '#111827' },
  totaleFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: BRAND,
    paddingTop: 5,
    marginTop: 3,
  },
  totaleFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totaleFinalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRAND },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: GRAY_TEXT },

  // Note
  noteBox: {
    marginBottom: 20,
    backgroundColor: GRAY_LIGHT,
    borderRadius: 4,
    padding: 10,
  },
  noteLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY_TEXT, textTransform: 'uppercase', marginBottom: 4 },
  noteText: { fontSize: 8, color: '#374151' },
})

function fmtData(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtValuta(n: number): string {
  return `€ ${n.toFixed(2)}`
}

function FatturaDocument({ fattura }: { fattura: Fattura }) {
  const righe = Array.isArray(fattura.righe) ? (fattura.righe as RigaFattura[]) : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>Otium Week</Text>
            <Text style={styles.brandSub}>otiumweek.it</Text>
          </View>
          <View style={styles.docBlock}>
            <Text style={styles.docTitle}>FATTURA</Text>
            <Text style={styles.docNumero}>N. {fattura.numero}</Text>
            <Text style={styles.docMeta}>Emessa il {fmtData(new Date(fattura.dataEmissione))}</Text>
            {fattura.dataScadenza && (
              <Text style={styles.docMeta}>Scadenza: {fmtData(new Date(fattura.dataScadenza))}</Text>
            )}
          </View>
        </View>

        {/* Indirizzi */}
        <View style={styles.addressRow}>
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>Fornitore</Text>
            <Text style={styles.addressName}>Otium Week S.r.l.</Text>
            <Text style={styles.addressLine}>P.IVA: IT00000000000</Text>
            <Text style={styles.addressLine}>otiumweek.it</Text>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>Cliente</Text>
            <Text style={styles.addressName}>{fattura.clienteNome}</Text>
            {fattura.clientePIva && <Text style={styles.addressLine}>P.IVA: {fattura.clientePIva}</Text>}
            {fattura.clienteCF && <Text style={styles.addressLine}>CF: {fattura.clienteCF}</Text>}
            {fattura.clienteIndirizzo && <Text style={styles.addressLine}>{fattura.clienteIndirizzo}</Text>}
            {(fattura.clienteCitta || fattura.clienteCap) && (
              <Text style={styles.addressLine}>
                {[fattura.clienteCap, fattura.clienteCitta, fattura.clienteProvincia].filter(Boolean).join(' ')}
              </Text>
            )}
            <Text style={styles.addressLine}>{fattura.clientePaese}</Text>
            {fattura.clienteSDI && <Text style={styles.addressLine}>SDI: {fattura.clienteSDI}</Text>}
            {fattura.clientePec && <Text style={styles.addressLine}>PEC: {fattura.clientePec}</Text>}
            {fattura.clienteEmail && <Text style={styles.addressLine}>{fattura.clienteEmail}</Text>}
          </View>
        </View>

        {/* Tabella */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Descrizione</Text>
            <Text style={[styles.th, styles.colQty]}>Qtà</Text>
            <Text style={[styles.th, styles.colPrice]}>Unitario</Text>
            <Text style={[styles.th, styles.colIva]}>IVA %</Text>
            <Text style={[styles.th, styles.colTotale]}>Totale</Text>
          </View>
          {righe.map((r, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.td, styles.colDesc]}>{r.descrizione}</Text>
              <Text style={[styles.td, styles.colQty]}>{r.quantita}</Text>
              <Text style={[styles.td, styles.colPrice]}>{fmtValuta(r.prezzoUnitario)}</Text>
              <Text style={[styles.td, styles.colIva]}>{r.iva}%</Text>
              <Text style={[styles.td, styles.colTotale]}>{fmtValuta(r.totale)}</Text>
            </View>
          ))}
        </View>

        {/* Totali */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Imponibile</Text>
            <Text style={styles.totalsValue}>{fmtValuta(fattura.imponibile)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>IVA ({fattura.aliquotaIva}%)</Text>
            <Text style={styles.totalsValue}>{fmtValuta(fattura.iva)}</Text>
          </View>
          <View style={styles.totaleFinalRow}>
            <Text style={styles.totaleFinalLabel}>TOTALE</Text>
            <Text style={styles.totaleFinalValue}>{fmtValuta(fattura.totale)}</Text>
          </View>
        </View>

        {/* Note */}
        {fattura.note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{fattura.note}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Otium Week · otiumweek.it</Text>
          <Text style={styles.footerText}>Fattura N. {fattura.numero}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generaPdfFattura(fattura: Fattura): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<FatturaDocument fattura={fattura} />)
  return new Uint8Array(buffer)
}
