import { createServer } from "node:http";
import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase, DatabaseHealthError } from "@lyricscloud/database";

const config = readRuntimeConfig(process.env);
const port = Number(process.env.COLLABORATION_PORT ?? "3001");
const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  if (request.url === "/health/live") return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "liveness", build: { version: config.appVersion, id: config.buildId } }));
  if (request.url === "/health/ready") {
    try {
      const database = await checkDatabase(config.databaseUrl);
      return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "readiness", build: { version: config.appVersion, id: config.buildId }, database }));
    } catch (error) {
      response.statusCode = 503;
      const reason = error instanceof DatabaseHealthError ? error.code : "CONFIG_INVALID";
      return response.end(JSON.stringify({ status: "unavailable", service: "collaboration", check: "readiness", reason }));
    }
  }
  response.statusCode = 404;
  return response.end(JSON.stringify({ error: "NOT_FOUND" }));
});
server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "service_started", service: "collaboration", port })));
