import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import sensible, { FastifySensibleOptions } from "@fastify/sensible";

declare module "fastify" {
  interface FastifyInstance {
    sensible: typeof sensible;
  }
}

const sensiblePlugin = async (app: FastifyInstance) => {
  app.register(sensible,{
  
  });

  app.decorate("sensible", app.sensible);
};

export default fp<FastifySensibleOptions>(sensiblePlugin, {
  name: "sensible",
});
