import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: 'ADMIN' | 'HOST'
    hostId: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'ADMIN' | 'HOST'
      hostId: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'ADMIN' | 'HOST'
    hostId: string | null
  }
}
