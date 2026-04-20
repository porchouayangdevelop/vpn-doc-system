import { log } from "console";
import { buildApp } from "./app";
import { AppConfig } from "./config/app.config";
import graceFulShutdown from "close-with-grace";
const runServer = async () => {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    log(`Received ${signal}, shutting down...`);

    const forceExitTimer = setTimeout(() => {
      app.log.error(`Force exit after 10 seconds timeout`);
    }, 10_000);

    forceExitTimer.unref();

    try {
      await app.close();
      clearTimeout(forceExitTimer);
      app.log.info("Server closed");
      process.exit(0);
    } catch (error) {
      app.log.error({ error }, "Error during server shutdown");
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGQUIT", () => shutdown("SIGQUIT"));

  process.on("uncaughtException", (promise, reason) => {
    console.error(`Unhandled Rejection at:`, promise, "reason", reason);
    process.exit(1);
  });

  graceFulShutdown({ delay: 10_000 }, async ({ signal, err, manual }) => {
    if (err) {
      app.log.error({ err }, "server closing due to error");
    } else {
      app.log.info({ signal, manual }, "graceful shutdown started");
    }
    await app.close();
  });

  try {
    const address = await app.listen({
      port: AppConfig.port,
      host: AppConfig.host,
    });

    const publicHost =
      AppConfig.host === "0.0.0.0" ? "localhost" : AppConfig.host;

    console.log(`User Server running mode : ${process.env.NODE_ENV}`);
    console.info(`🚀 Server is running on ${address}`);
    console.info(`📝 API Version: v${1}`);
    console.info(
      `📝 API Document: http://${publicHost}:${AppConfig.port}/docs`,
    );
    console.info(
      `📝 API Scalar Document: http://${publicHost}:${AppConfig.port}/reference`,
    );
    console.info(`🔐 Service: 'User Authentication & Authorization Service'`);
  } catch (error: any) {
    if (error?.code === "EADDRINUSE") {
      app.log.error(
        `Port ${AppConfig.port} is already in use on host ${AppConfig.host}. Please stop the process using this port or change PORT/HOST in your environment settings.`,
      );
    }
    app.log.error(error);
    process.exit(1);
  }
};

runServer();
