import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type {FastifyInstance, FastifyPluginOptions} from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}


async function redisPlugin(app:FastifyInstance,_opts:FastifyPluginOptions) {
  const redis = new Redis({
    host:app.config.REDIS_HOST,
    port:app.config.REDIS_PORT,
    password:app.config.REDIS_PASS,
    family:4,
    lazyConnect:false,
  });
  
  await redis.ping();
  app.log.info("Redis connected");  
  app.decorate("redis",redis);
  app.addHook("onClose",async()=>{
    await redis.quit();
    app.log.info("Redis connection closed");
  });
}

export default fp(redisPlugin,{
  name:'redis',
});