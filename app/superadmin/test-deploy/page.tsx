export const dynamic = 'force-dynamic'

export default function TestDeployPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 32 }}>✅ Deploy funzionante</h1>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>Se vedi questa pagina, il deploy di Vercel funziona.</p>
    </div>
  )
}
