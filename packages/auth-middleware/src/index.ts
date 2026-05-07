// packages/auth-middleware/src/index.ts
// ທຸກ microservice ໃຊ້ plugin ນີ້ ແທນທີ່ຈະ verify JWT ຕົນເອງ
// Services ຮັບ request ຜ່ານ Gateway ເທົ່ານັ້ນ
// Gateway attach X-User-* headers → services trust headers ໂດຍກົງ

import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { UserContext, BankRole, XUserHeaders } from '@vpndoc/shared-types'

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth:  (req: FastifyRequest, rep: FastifyReply) => Promise<void>
    requireRoles: (roles: BankRole[]) => (req: FastifyRequest, rep: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    userCtx: UserContext
  }
}

export default fp(async (fastify: FastifyInstance) => {

  // ── ດຶງ UserContext ຈາກ X-User headers ─────────────────
  function extractUserContext(req: FastifyRequest): UserContext | null {
    const h = req.headers as unknown as XUserHeaders

    const userId    = h['x-user-id']
    const role      = h['x-user-role'] as BankRole
    const branchId  = h['x-user-branch-id']

    if (!userId || !role || !branchId) return null

    return {
      keycloakId:   h['x-user-keycloak-id'] || '',
      userId,
      employeeCode: (req.headers['x-user-employee-code'] as string) || '',
      fullName:     h['x-user-name'] || '',
      email:        h['x-user-email'] || '',
      role,
      branchId,
      departmentId: (req.headers['x-user-department-id'] as string) || null,
    }
  }

  // ── requireAuth: ຕ້ອງ login ──────────────────────────────
  fastify.decorate('requireAuth', async (req: FastifyRequest, rep: FastifyReply) => {
    // ປ້ອງກັນ bypass: ຮັບ X-User headers ຈາກ internal network ເທົ່ານັ້ນ
    // ໃນ production ໃຊ້ internal IP range check ຫຼື mTLS
    const ctx = extractUserContext(req)
    if (!ctx) {
      return rep.code(401).send({
        success: false,
        message: 'Unauthorized — missing user context from gateway',
      })
    }
    req.userCtx = ctx
  })

  // ── requireRoles: ກວດ role ──────────────────────────────
  fastify.decorate('requireRoles', (roles: BankRole[]) => {
    return async (req: FastifyRequest, rep: FastifyReply) => {
      await fastify.requireAuth(req, rep)
      if (rep.sent) return

      const { role } = req.userCtx
      if (role !== 'admin' && !roles.includes(role)) {
        return rep.code(403).send({
          success: false,
          message: `Role '${role}' not permitted. Required: ${roles.join(', ')}`,
        })
      }
    }
  })
})