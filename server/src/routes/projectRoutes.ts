import { Router } from "express";
import * as projectController from "../controllers/projectController";
import { requireAuth } from "@clerk/express";

const router = Router();

// GET /api/projects => get all projects (public)
router.get("/", projectController.getAllProjects);

// GET /api/projects/my => get projects by current user (private)
router.get("/my", requireAuth(), projectController.getMyProjects);

// GET /api/projects/:id => get project by id (public)
router.get("/:id", projectController.getProjectById);

// POST /api/projects => create a new project (private)
router.post("/", requireAuth(), projectController.createProject);

// PUT /api/projects/:id => update a project (private - owner only)
router.put("/:id", requireAuth(), projectController.updateProject);

// DELETE /api/projects/:id => delete a project (private - owner only)
router.delete("/:id", requireAuth(), projectController.deleteProject);

// GET /api/projects/:id/summary => get a total seconds by project
router.get("/:id/summary", requireAuth(), projectController.getProjectSummary);

// GET /api/projects/:id/tasks-summary => get time per task for a project
router.get("/:id/tasks-summary", requireAuth(), projectController.getProjectTasksSummary);

export default router;