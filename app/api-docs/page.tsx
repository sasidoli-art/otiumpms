export const dynamic = 'force-static'
export const revalidate = 3600

export default function ApiDocsPage() {
  // Swagger UI via CDN (niente npm deps — lean)
  return (
    <html lang="en">
      <head>
        <title>Otium PMS API — Docs</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
        <style>{`
          body { margin: 0; background: #fafafa; }
          .topbar { display: none !important; }
        `}</style>
      </head>
      <body>
        <div id="swagger-ui" />
        <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function () {
                window.ui = SwaggerUIBundle({
                  url: '/api-docs.json',
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                  layout: 'BaseLayout',
                  docExpansion: 'list',
                  defaultModelsExpandDepth: -1,
                  persistAuthorization: true,
                });
              };
            `,
          }}
        />
      </body>
    </html>
  )
}
