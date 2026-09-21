import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../utils/params.js";
import { countAdmins, createUserByAdmin, deleteUser, getUserById, isUsernameTaken, listUsers } from "../services/userService.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", (_req, res) => {
  res.json({ users: listUsers() });
});

const createSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});

usersRouter.post("/", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  if (isUsernameTaken(parsed.data.username)) {
    res.status(409).json({ error: "username_taken" });
    return;
  }
  const user = createUserByAdmin(parsed.data.username, parsed.data.password);
  res.status(201).json({ user });
});

usersRouter.delete("/:id", (req: AuthedRequest, res) => {
  const targetId = param(req, "id");

  if (targetId === req.userId) {
    res.status(400).json({ error: "cannot_delete_self" });
    return;
  }

  const target = getUserById(targetId);
  if (!target) {
    res.status(404).end();
    return;
  }
  if (target.isAdmin && countAdmins() <= 1) {
    res.status(400).json({ error: "cannot_delete_last_admin" });
    return;
  }

  deleteUser(targetId);
  res.status(204).end();
});
