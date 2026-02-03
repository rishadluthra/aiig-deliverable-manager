import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { prisma } from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Endpoint to get projects with optional search query
// Call: GET /api/projects?search=keyword
// Returns: [{id, name}]
app.get("/api/projects", async (req, res) => {
  const { search } = req.query as { search?: string };
  try {
    const projects = await prisma.project.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {},
      orderBy: { name: "asc" },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Endpoint to get deliverables for a specific project
// Call: GET /api/projects/:projectId/deliverables
// Returns: [{id, title, dueDate, project}]
app.get("/api/projects/:id/deliverables", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId))
      return res.status(400).json({ error: "Invalid project ID" });

    const deliverables = await prisma.deliverable.findMany({
      where: { projectId },
      include: { project: true },
      orderBy: { dueDate: "asc" },
    });
    res.json(deliverables);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
