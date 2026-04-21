import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@agentforge/db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: process.env['API_URL'] ?? 'http://localhost:3001',
  secret: process.env['BETTER_AUTH_SECRET'] ?? 'dev-secret-change-in-production',
  trustedOrigins: [process.env['CORS_ORIGIN'] ?? 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    ...(process.env['GITHUB_CLIENT_ID'] && {
      github: {
        clientId: process.env['GITHUB_CLIENT_ID']!,
        clientSecret: process.env['GITHUB_CLIENT_SECRET']!,
      },
    }),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create a workspace for every new user
          await prisma.workspace.create({
            data: {
              name: `${user.name}'s Workspace`,
              members: { create: { userId: user.id, role: 'owner' } },
            },
          })
        },
      },
    },
  },
})

export type Auth = typeof auth
