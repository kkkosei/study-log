import { CronJob } from "cron";
import http from "node:http";
import https from "node:https";
import { ENV } from "./env";

const job = new CronJob("*/14 * * * *", function() {
  const base = ENV.FRONTEND_URL || "http://localhost:5173";
  if (!base) return;

  const url = new URL("/health", base).href;
  const client = url.startsWith("https") ? https : http;

  client
    .get(url, (res) => {
      if (res.statusCode == 200) console.log(`Health check successful: ${url}`);
      else console.log(`Health check failed with status ${res.statusCode}: ${url}`);
  })
});

export default job;