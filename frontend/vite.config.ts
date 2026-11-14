import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import path from 'node:path'

const backendDirectory = path.resolve(import.meta.dirname, '../backend')
const repositoryRoot = path.resolve(import.meta.dirname, '..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The key never reaches the browser: the proxy adds it server-side.
  // Same precedence as the backend: frontend env, then backend/.env, then the repository root .env.
  const key = env.RAG_API_KEY ||
    loadEnv(mode, backendDirectory, 'RAG_API_KEY').RAG_API_KEY ||
    loadEnv(mode, repositoryRoot, 'RAG_API_KEY').RAG_API_KEY
  const target = env.RAG_BACKEND_URL || 'http://127.0.0.1:8000'
  const proxy: ProxyOptions = {
    target,
    changeOrigin: true,
    rewrite: (url) => url.replace(/^\/research-gateway/, ''),
    configure(server) {
      server.on('proxyReq', (request) => {
        request.removeHeader('x-api-key')
        if (key) request.setHeader('X-API-Key', key)
      })
    },
    timeout: 180_000,
    proxyTimeout: 180_000,
  }
  // Only the research endpoints the app uses are forwarded.
  const routes = {
    '^/research-gateway/(?:api/v1/(?:audiences|earth|gravity|research/(?:filters|relevance)|investigations(?:/[A-Za-z0-9_/-]+)?|rank|interpret)|scenario/(?:fields|options|rank|interpret)|learning/materials)(?:\\?|$)': proxy,
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    // One eager bundle: every page and 3D scene downloads up front, so nothing loads piece by piece later.
    // The lazy() imports in the code still work; they resolve from this same file.
    build: {
      chunkSizeWarningLimit: 4096,
      rolldownOptions: { output: { codeSplitting: false } },
    },
    server: { host: '127.0.0.1', proxy: routes },
    preview: { host: '127.0.0.1', proxy: routes },
  }
})
