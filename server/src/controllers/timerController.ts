import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import * as queries from "../db/queries";

/**
 * Retrieve the current timer session for the authenticated user.
 *
 * @returns The current timer session object when found; otherwise an error object with an `error` message (e.g., for unauthorized access or internal failure).
 */
export async function getCurrentTimer(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const session = await queries.getCurrentTimerSession(userId);
    return res.status(200).json(session);
  } catch (error) {
    console.error("Error getting current timer:", error);
    return res.status(500).json({ error: "Failed to get current timer" });
  }
}

/**
 * Start a new timer session for the authenticated user on the specified task.
 *
 * Validates authentication and `taskId` in the request body. Responds with:
 * - 401 if the user is not authenticated,
 * - 400 if `taskId` is missing,
 * - 409 if a timer session is already running,
 * - 500 for other errors.
 */
export async function startTimer(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const task = await queries.getTaskOwnedByUser(taskId, userId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const session = await queries.startTimerSession(userId, taskId, task.projectId);
    return res.status(201).json(session);

  } catch (e: any) {
    if (e?.message === "A timer session is already running") {
      return res.status(409).json({ error: e.message });
    }
    console.error("Error starting timer:", e);
    return res.status(500).json({ error: "Failed to start timer" });
  }
}

/**
 * Stops the authenticated user's currently running timer and responds with the stopped session.
 *
 * @returns The HTTP response containing the stopped timer session data on success; on error it returns JSON with an appropriate status code (`401` if unauthenticated, `409` if no running timer, `500` for server errors).
 */
export async function stopTimer(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const running = await queries.getCurrentTimerSession(userId);
    if (!running) return res.status(409).json({ error: "No running timer" });

    const now = new Date();
    const durationSec = Math.max(
      0,
      Math.floor((now.getTime() - new Date(running.startedAt).getTime()) / 1000)
    );

    const stopped = await queries.stopCurrentTimerSession(userId, durationSec);
    return res.status(200).json(stopped);
  } catch (error) {
    console.error("Error stopping timer:", error);
    return res.status(500).json({ error: "Failed to stop timer" });
  }
}