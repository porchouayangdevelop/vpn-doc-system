import { FastifyInstance, FastifyReply } from 'fastify';
import type { UserContext, BankRole } from '@vpndoc/shared-types';
declare module 'fastify' {
    interface FastifyInstance {
        requireAuth: (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
        requireRoles: (roles: BankRole[]) => (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
    }
    interface FastifyRequest {
        userCtx: UserContext;
    }
}
declare const _default: (fastify: FastifyInstance) => Promise<void>;
export default _default;
//# sourceMappingURL=index.d.ts.map