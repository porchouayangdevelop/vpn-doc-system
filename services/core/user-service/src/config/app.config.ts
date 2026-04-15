import { config } from "dotenv";
import { log, time } from "node:console";

const loadEnv = process.env.NODE_ENV === "production" ? ".env.prod" : ".env";

const result = config({
  path: loadEnv,
});

if (result.error) {
  throw result.error;
}

export const AppConfig = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3002),

  db: {
    host: process.env.DB_HOST as string,
    port: Number(process.env.DB_PORT),
    name: process.env.DB_NAME as string,
    user: process.env.DB_USER as string,
    pass: process.env.DB_PASS as string,

    //pool options
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT),
    acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT) ?? 10_000,
  },

  redis: {
    host: process.env.REDIS_HOST ?? "10.1.11.179",
    port: Number(process.env.REDIS_PORT) ?? 6379,
    password: process.env.REDIS_PASS ?? "Por29121994",
    lazyConnect: false,
  },

  internalSecret:
    process.env.INTERNAL_SECRET ??
    "internal-secret-change-in-prod-min-32-chars",
};
