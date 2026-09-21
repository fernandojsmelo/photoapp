import "dotenv/config";
import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  dataDir: path.resolve(process.env.DATA_DIR ?? "./data"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  isProduction: process.env.NODE_ENV === "production",
};

if (config.jwtSecret === "dev-insecure-secret-change-me" && config.isProduction) {
  throw new Error("Defina JWT_SECRET no ambiente antes de rodar em produção.");
}
