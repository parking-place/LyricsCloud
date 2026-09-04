import { createServer } from "node:http";
import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase } from "@lyricscloud/database";

const config = readRuntimeConfig(process.env);
const port = Number(process.env.COLLABORATION_PORT ?? "3001");
const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.url === "/health/live") return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "liveness" }));
  if (request.url === "/health/ready") {
    try {
      await checkDatabase(config.databaseUrl);
      return response.end(JSON.stringify({ status: "ok", service: "collaboration", check: "readiness" }));
    } catch {
      response.statusCode = 503;
      return response.end(JSON.stringify({ status: "unavailable", service: "collaboration", check: "readiness" }));
    }
  }
  response.statusCode = 404;
  return response.end(JSON.stringify({ error: "NOT_FOUND" }));
});
server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "service_started", service: "collaboration", port })));
