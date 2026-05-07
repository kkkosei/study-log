import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { createComment, deleteComment } from "../controllers/commentController";

const router = Router();

// POST /api/comments/:projectId - Create a new comment for a project (private)
router.post("/:projectId", requireAuth(), createComment);

// DELETE /api/comments/:commentId - Delete a comment by its ID (private - owner only)
router.delete("/:commentId", requireAuth(), deleteComment);

export default router;