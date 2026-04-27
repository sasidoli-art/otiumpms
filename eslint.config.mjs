import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'

/**
 * ESLint flat config nativa (v9+).
 *
 * Note: eslint-config-next 16 non è ancora migrato a flat config (ha
 * riferimenti circolari con FlatCompat). Quindi NON usiamo `next/*` —
 * carichiamo direttamente i plugin essenziali.
 *
 * Cosa copre:
 *  - Regole TypeScript essenziali (typescript-eslint recommended)
 *  - React Hooks rules (exhaustive-deps + rules-of-hooks)
 *
 * Cosa NON copre (gestito altrove):
 *  - Type-checking vero → `npm run type-check` (tsc)
 *  - Next.js core-web-vitals warnings → quando eslint-config-next 16 sarà
 *    flat-compatible, riaggiungere
 */
export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'prisma/migrations/**',
      'scripts/visual-audit.ts',
      '_archive/**',
      '_extract/**',
      'next-env.d.ts',
      '*.config.mjs',
      '*.config.ts',
      'public/embed.js',
      'tests/**',
      'e2e/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-console': 'off',
      'no-useless-escape': 'warn',
      'no-constant-condition': 'warn',
      'prefer-const': 'warn',
      // Next.js: registriamo le regole base così i `// eslint-disable-next-line @next/next/...` sono validi
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]
