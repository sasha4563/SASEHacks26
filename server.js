import express from 'express'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'missing-person-match-api' })
})

app.post('/api/matches', (req, res) => {
  const { missing_person, candidates } = req.body || {}

  if (!missing_person || !Array.isArray(candidates)) {
    return res.status(400).json({
      error: 'Expected JSON body with missing_person and candidates[]',
    })
  }

  const python = spawn(
    path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
    ['matching_service.py', JSON.stringify({ missing_person, candidates })],
    {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let stdout = ''
  let stderr = ''

  python.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })

  python.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  python.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: 'Python matching service failed',
        detail: stderr || 'Unknown Python error',
      })
    }

    try {
      const payload = JSON.parse(stdout)
      return res.json(payload)
    } catch (error) {
      return res.status(500).json({
        error: 'Invalid JSON from matching service',
        detail: stdout || String(error),
      })
    }
  })
})

app.listen(port, () => {
  console.log(`Match API listening on http://localhost:${port}`)
})
