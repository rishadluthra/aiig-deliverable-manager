import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { prisma } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AIIG Deliverables API running' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({ take: 3 });
    res.json({ 
      success: true,
      message: 'Prisma 7 + Postgres ready',
      projects: projects.length 
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
