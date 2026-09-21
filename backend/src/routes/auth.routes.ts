import { Router } from "express";
import { z } from "zod";
import { createUser, hasAnyUser, verifyUser, getUserById } from "../services/userService.js";
import { clearAuthCookie, requireAuth, setAuthCookie, signToken, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});

authRouter.get("/status", (_req, res) => {
  res.json({ hasUser: hasAnyUser() });
});

authRouter.post("/setup", (req, res) => {
  if (hasAnyUser()) {
    res.status(409).json({ error: "already_configured" });
    return;
  }
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }
  const user = createUser(parsed.data.username, parsed.data.password);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
});

authRouter.post("/login", (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  const user = verifyUser(parsed.data.username, parsed.data.password);
  if (!user) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  setAuthCookie(res, signToken(user.id));
  res.json({ user });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  res.json({ user });
});
