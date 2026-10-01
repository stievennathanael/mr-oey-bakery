import jwt, { type JwtPayload } from 'jsonwebtoken'

export type AuthRole = 'admin' | 'customer'

export type AuthUser = {
  id: number
  role: AuthRole
}

type TokenPayload = JwtPayload & {
  id?: number | string
  role?: string
}

const getJwtSecret = () =>
  process.env.JWT_SECRET ||
  'MrOeyLocalDevelopmentSecret'

export function signAuthToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: '7d',
    }
  )
}

export function getAuthUser(
  req: Request
): AuthUser | null {
  const authorization =
    req.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice(7)

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as TokenPayload

    const id = Number(decoded.id)
    const role = decoded.role

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      (role !== 'admin' &&
        role !== 'customer')
    ) {
      return null
    }

    return {
      id,
      role,
    }
  } catch {
    return null
  }
}

export function isAdmin(user: AuthUser) {
  return user.role === 'admin'
}
