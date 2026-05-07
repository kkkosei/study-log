import { Router } from "express";
import {
  getAllProjects,
  getMyProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectSummary,
  getProjectTasksSummary
} from "../controllers/projectController";
import { requireAuth } from "@clerk/express";

const router = Router();

// GET /api/projects => get all projects (public)
router.get("/", getAllProjects);

// GET /api/projects/my => get projects by current user (private)
router.get("/my", requireAuth(), getMyProjects);

// GET /api/projects/:id => get project by id (public)
router.get("/:id", getProjectById);

// POST /api/projects => create a new project (private)
router.post("/", requireAuth(), createProject);

// PUT /api/projects/:id => update a project (private - owner only)
router.put("/:id", requireAuth(), updateProject);

// DELETE /api/projects/:id => delete a project (private - owner only)
router.delete("/:id", requireAuth(), deleteProject);

// GET /api/projects/:id/summary => get a total seconds by project
router.get("/:id/summary", requireAuth(), getProjectSummary);

// GET /api/projects/:id/tasks-summary => get time per task for a project
router.get("/:id/tasks-summary", requireAuth(), getProjectTasksSummary);

export default router;