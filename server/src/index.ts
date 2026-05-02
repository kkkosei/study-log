import Express from "express";
import cors from "cors";
import path from "path";

import { ENV } from "./config/env";
import { clerkMiddleware } from '@clerk/express'
import keepAliveCron from "./config/cron";

import userRoutes from "./routes/userRoutes";
import projectRoutes from "./routes/projectRoutes";
import commentRoutes from "./routes/commentRoutes";
import timerRoutes from "./routes/timerRoutes";
import projectTaskRoutes, { taskRouter } from "./routes/taskRoutes";
import pomodoroRoutes from "./routes/pomodoroRoutes";

const app = Express();

if (!ENV.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is required for credentialed CORS");
}
app.use(cors({origin:ENV.FRONTEND_URL, credentials:true})); // enable CORS
// credentials:true allows cookies to be sent/received across domains like frontend to backend
app.use(clerkMiddleware()); // auth obj will be attached to req
app.use(Express.json()); // parses json requests bodies
app.use(Express.urlencoded({ extended: true })); // parses from data (like HTML forms)

app.get("/health", (req, res) => {
  res.json({ ok: true});
});

app.get("/api/health", (req, res) => {
  res.json({ 
    message: "Welcome to study log API - Powered by PostgresSQL, Dizzle ORM & Clerk Auth" ,
    endpoints: {
      users: "/api/users",
      projects: "/api/projects",
      comments: "/api/comments",
      timer: "/api/timer"},
  });
});

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/timer", timerRoutes);
app.use("/api/projects", projectTaskRoutes);
app.use("/api/tasks", taskRouter);
app.use("/api/comments", commentRoutes);
app.use("/api/pomodoro", pomodoroRoutes);

if(ENV.NODE_ENV == "production"){
  const __dirname = path.resolve();

  //serve static files from client/dist
  const clientDist = path.join(__dirname, "../client/dist");
  app.use(Express.static(clientDist));

  // handle SPA routing - send all non-API routes to index.html - react app
  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT}`);
  if (ENV.NODE_ENV === "production") {
    keepAliveCron.start()
  }
});