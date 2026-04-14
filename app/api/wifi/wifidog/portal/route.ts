import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/wifi/wifidog/portal/
 *
 * Pagina "benvenuto" servita dopo che il router ha autorizzato il client.
 * Il router redirige qui dopo un Auth: 1 success, tipicamente subito dopo
 * aver whitelistato il MAC.
 *
 * Mostra una pagina semplice di conferma. Il client a questo punto puo'
 * chiudere la pagina e navigare liberamente.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const gw_id = sp.get('gw_id') ?? ''
  const url = sp.get('url') ?? ''

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Otium Wi-Fi — Connesso</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%);
      color: white;
      padding: 24px;
    }
    .card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 { font-size: 28px; margin-bottom: 12px; font-weight: 700; }
    p { font-size: 15px; opacity: 0.9; line-height: 1.5; margin-bottom: 20px; }
    .btn {
      display: inline-block;
      background: white;
      color: #4f46e5;
      padding: 14px 28px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin-top: 8px;
    }
    .footer { font-size: 11px; opacity: 0.7; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Sei connesso!</h1>
    <p>La tua sessione Wi-Fi è attiva. Puoi chiudere questa pagina e navigare liberamente.</p>
    ${url ? `<a class="btn" href="${escapeHtml(url)}">Continua navigazione →</a>` : ''}
    <div class="footer">Otium Wi-Fi · Log conservati 6 mesi · GDPR compliant</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
