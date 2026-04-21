import type { FastifyInstance } from 'fastify'
import { auth } from '../lib/auth.js'

export async function authRoutes(fastify: FastifyInstance) {
  // Use Better Auth's Web API handler — avoids body-stream conflicts with Fastify
  fastify.all('/api/auth/*', { config: { rateLimit: { max: 20, timeWindow: 60_000 } } }, async (req, reply) => {
    const protocol = req.headers['x-forwarded-proto'] ?? 'http'
    const host = req.headers.host ?? 'localhost:3001'
    const url = `${protocol}://${host}${req.url}`

    const headers = new Headers()
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val)
    }

    const isBodyMethod = !['GET', 'HEAD'].includes(req.method)
    const body = isBodyMethod && req.body != null
      ? JSON.stringify(req.body)
      : undefined

    const request = new Request(url, { method: req.method, headers, body })
    const response = await auth.handler(request)

    reply.status(response.status)
    response.headers.forEach((val, key) => reply.header(key, val))
    reply.send(await response.text())
  })
}
