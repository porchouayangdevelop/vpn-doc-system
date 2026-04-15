import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  FastifyAwilixOptions,
  fastifyAwilixPlugin,
  diContainer,
} from "@fastify/awilix";
import { asClass, asFunction, asValue, Lifetime } from "awilix";
import UserService from "@/modules/users/user.service";
import AuthService from "@/modules/auth/auth.service";
import { BranchRepo } from "@/modules/branches/branch.repo";
import { DepartmentRepo } from "@/modules/departments/dep.repo";
import { Pool, PoolConnection } from "mariadb";
import Redis from "ioredis";
import { BankRole } from "@vpndoc/shared-types";

declare module "@fastify/awilix" {
  interface Cradle {
    //db
    db: Pool;
    redis: Redis;
    logger: FastifyInstance["log"];
    // userService: UserService;
    // authService: AuthService;
    branchRepo: BranchRepo;
    depRepo: DepartmentRepo;
  }

  interface RequestCradle {
    userService: UserService;
    authService: AuthService;
    currentUser: { sub?: string; groups: string[] | BankRole[] | undefined };
  }
}

export default fp(
  async (fastify: FastifyInstance, opts: FastifyAwilixOptions) => {
    await fastify.register(fastifyAwilixPlugin, {
      disposeOnClose: true,
      disposeOnResponse: true,
      asyncInit: true,
      asyncDispose: true,
      eagerInject: true,
      strictBooleanEnforced: true,
    });

    diContainer.register({
      //db,redis,logger
      db: asValue(fastify.db),
      redis: asValue(fastify.redis),
      logger: asValue(fastify.log),

      branchRepo: asClass(BranchRepo, {
        lifetime: Lifetime.SINGLETON,
        dispose: (mod) => mod.dispose(),
      }),
      depRepo: asClass(DepartmentRepo, {
        lifetime: Lifetime.SINGLETON,
        dispose: (mod) => mod.dispose(),
      }),
    });

    fastify.addHook("onRequest", (req, reply, done) => {
      req.diScope.register({
        userService: asFunction(
          ({ userRepo, branchRepo, depRepo }) => {
            return new UserService(userRepo, branchRepo, depRepo);
          },
          {
            lifetime: Lifetime.SCOPED,
          },
        ),
      });
      done();
    });

    fastify.log.info("DI registered");
  },

  { name: "di", dependencies: ["db", "redis"] },
);
