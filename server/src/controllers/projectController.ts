import type { Request, Response } from "express";
import * as queries from "../db/queries";
import { getAuth } from "@clerk/express";

// Get all projects (public)
export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = await queries.getAllProjects();
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get projects by current user (private)
export const getMyProjects = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const projects = await queries.getProjectsByUserId(userId);
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching user's projects:", error);
    res.status(500).json({ message: "Failed to fetch user's projects" });
  }
};

// Get project by id (public)
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await queries.getProjectById(String(id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
};

// Create a new project (private)
export const createProject = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { title, description, imageUrl } = req.body;
    if (!title || !description || !imageUrl) {
      return res.status(400).json({ message: "Title, description, and imageUrl are required" });
    }
    const project = await queries.createProject({
      title,
      description,
      imageUrl,
      userId,
    });
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Failed to create project" });
  } 
};

// Update a project (private)
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { title, description, imageUrl } = req.body;

    const existingProject = await queries.getProjectById(String(id));
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (existingProject.userId !== userId) {
      return res.status(403).json({ message: "You can only update your own projects" });
    } 

    const project = await queries.updateProject(String(id), {
      title,
      description,
      imageUrl,
    });
    res.status(200).json(project);

  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
};

//Delete a project (private)
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const existingProject = await queries.getProjectById(String(id));
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (existingProject.userId !== userId) {
      return res.status(403).json({ message: "You can only delete your own projects" });
    }

    await queries.deleteProject(String(id));
    res.status(200).json({ message: "Project deleted successfully" });

  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Failed to delete project" });
  }
};

export async function getProjectSummary(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const totalSeconds = await queries.getProjectTotalTime(String(id), userId);

    return res.status(200).json({ totalSeconds });
  } catch (e) {
    console.error("Error getting project summary:", e);
    return res.status(500).json({ error: "Failed to get project summary" });
  }
}

export async function getProjectTasksSummary(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const tasks = await queries.getTasksTimeByProjectId(String(id), userId);

    return res.status(200).json(tasks);
  } catch (e) {
    console.error("Error getting project tasks summary:", e);
    return res.status(500).json({ error: "Failed to get project tasks summary" });
  }
}