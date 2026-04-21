import { createAuthClient } from 'better-auth/react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = createAuthClient({ baseURL: `${API_URL}/api/auth` }) as any

export const authClient = client
export const signIn = client.signIn as ReturnType<typeof createAuthClient>['signIn']
export const signUp = client.signUp as ReturnType<typeof createAuthClient>['signUp']
export const signOut = client.signOut as ReturnType<typeof createAuthClient>['signOut']
export const useSession = client.useSession as ReturnType<typeof createAuthClient>['useSession']
