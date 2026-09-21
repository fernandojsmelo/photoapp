import type { Request } from "express";

/** Express 5 tipa req.params como string | string[]; nossas rotas nunca usam params repetidos. */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}
