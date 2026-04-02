import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: 'SUPERADMIN' | 'ADMIN' | 'DIREZIONE' | 'HOST' | 'STAFF'
    hostId: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'SUPERADMIN' | 'ADMIN' | 'DIREZIONE' | 'HOST' | 'STAFF'
      hostId: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'SUPERADMIN' | 'ADMIN' | 'DIREZIONE' | 'HOST' | 'STAFF'
    hostId: string | null
  }
}
