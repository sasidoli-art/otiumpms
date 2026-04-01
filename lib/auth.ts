import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 1 giorno (ridotto da 30)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, _req): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password obbligatorie')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { host: true },
        })

        if (!user) {
          throw new Error('Credenziali non valide')
        }

        if (!user.attivo) {
          throw new Error('Account disabilitato. Contatta il supporto.')
        }

        const passwordOk = await bcrypt.compare(credentials.password, user.password)
        if (!passwordOk) {
          throw new Error('Credenziali non valide')
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.nome} ${user.cognome}`,
          role: user.role,
          hostId: user.host?.id ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.hostId = user.hostId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.hostId = token.hostId
      }
      return session
    },
  },
}
