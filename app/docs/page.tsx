export const metadata = { title: 'API Docs — Otium Week' }

export default function DocsPage() {
  return (
    <html lang="it">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui" />
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function() {
                SwaggerUIBundle({
                  url: '/api-docs.json',
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [SwaggerUIBundle.presets.apis],
                  layout: 'BaseLayout',
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
