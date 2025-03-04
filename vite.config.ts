import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as Sentry from "@sentry/vite-plugin"
import envPlugin from 'vite-plugin-environment'

export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente do .env (not really used here, but kept for consistency)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Expondo SOMENTE as variáveis necessárias, com VALORES PADRÃO
      envPlugin({
        VITE_FIREBASE_API_KEY: 'YOUR_FIREBASE_API_KEY', // Placeholder
        VITE_FIREBASE_AUTH_DOMAIN: 'YOUR_FIREBASE_AUTH_DOMAIN', // Placeholder
        VITE_FIREBASE_PROJECT_ID: 'YOUR_FIREBASE_PROJECT_ID', // Placeholder
        VITE_FIREBASE_STORAGE_BUCKET: 'YOUR_FIREBASE_STORAGE_BUCKET', // Placeholder
        VITE_FIREBASE_MESSAGING_SENDER_ID: 'YOUR_FIREBASE_MESSAGING_SENDER_ID', // Placeholder
        VITE_FIREBASE_APP_ID: 'YOUR_FIREBASE_APP_ID', // Placeholder
        VITE_FIREBASE_MEASUREMENT_ID: 'YOUR_FIREBASE_MEASUREMENT_ID', // Placeholder
        VITE_SENTRY_DSN: 'YOUR_SENTRY_DSN', // Placeholder
        VITE_APP_ENV: 'development', // Default to 'development'
        SENTRY_AUTH_TOKEN: 'YOUR_SENTRY_AUTH_TOKEN' // Placeholder
      }, {
        // Add this option to prevent the error when variables are undefined
        defineOn: 'import.meta.env',
      }),
      Sentry.sentryVitePlugin({
        org: "vemsimbora",          // Verifique se esse é o nome correto da organização
        project: "vemsimbora", // Verifique se esse é o nome correto do projeto
        authToken: env.SENTRY_AUTH_TOKEN,
        release: {
          name: env.VITE_SENTRY_RELEASE || "default-release",
          inject: true
        }
      })
    ],
    server: {
      port: 3000,
      open: true,
      cors: true,
      historyApiFallback: true, // THIS IS THE KEY CHANGE FOR SPA ROUTING
    },
    preview: {
      port: 8080
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html']
      }
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
})
