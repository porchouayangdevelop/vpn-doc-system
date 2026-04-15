import fp from "fastify-plugin";
import Redis from "ioredis";
import type {
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyPluginCallback,
  FastifyInstance,
} from "fastify";

const redisPlugin = (fastify: FastifyInstance) => {
  const redis = new Redis({
    host: fastify.config.REDIS_HOST,
    port: fastify.config.REDIS_PORT,
    password: fastify.config.REDIS_PASS,
    family: 4,
    lazyConnect: false,
  });

  redis.ping();
  fastify.log.info("Redis connected");  

  fastify.decorate("fastifyRedis", redis);

  fastify.addHook("onClose", async () => {
    await redis.quit();
    fastify.log.info("Redis connection closed");
  });
};

export default fp(redisPlugin, {
  name: "redis",
  dependencies: ["env"],
});

declare module "fastify" {
  interface FastifyInstance {
    fastifyRedis: Redis;
  }
}
