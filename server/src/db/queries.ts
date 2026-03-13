import { db } from "./index"
import { and, eq, isNull, sql } from "drizzle-orm";
import { 
  users,
  projects, 
  tasks,
  timerSessions,
  comments, 
  type NewUser, 
  type NewProject, 
  type NewTask,
  type NewTimerSession,
  type NewComment, 
  pomodoroSettings,
  pomodoroState
} from "./schema"


// User Queries
export const createUser = async (data: NewUser) => {
  const [user] = await db.insert(users).values(data).returning();
  return user;
};

export const getUserById = async (id: string) => {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
};

export const updateUser = async (id: string, data: Partial<NewUser>) => {
  const existingUser = await getUserById(id);
  if (!existingUser) {
    throw new Error(`User with id ${id} does not exist`);
  }
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return user;
};

// upsert => create or update
export const upsertUser = async (data: NewUser) => {
  const [user] = await db
    .insert(users)
    .values(data)
    .onConflictDoUpdate({
      target: users.id,
      set: data,
    })
    .returning();
  return user;
};

// Project Queries
export const createProject = async (data: NewProject) => {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
};

export const getAllProjects = async () => {
  return db.query.projects.findMany({
    with: {user: true},
    orderBy: (projects, { desc }) => [desc(projects.createdAt)] // square brackets are required because Drizzle ORM`s orderBy expects an array, even for a single column
  });
};

export const getProjectById = async (id: string) => {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { 
      user: true, 
      comments: { 
        with: { user: true },
        orderBy: (comments, { desc }) => [desc(comments.createdAt)]
      },
    },
  });
};

export const getProjectsByUserId = async (userId: string) => {
  return db.query.projects.findMany({
    where: eq(projects.userId, userId),
    with: { user: true },
    orderBy: (projects, { desc }) => [desc(projects.createdAt)],
  });
};

export const updateProject = async (id: string, data: Partial<NewProject>) => {
  const existingProject = await getProjectById(id);
  if (!existingProject) {
    throw new Error(`Project with id ${id} does not exist`);
  }

  const [project] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
  return project;
};

export const deleteProject = async (id: string) => {
  const existingProject = await getProjectById(id);
  if (!existingProject) {
    throw new Error(`Project with id ${id} does not exist`);
  }

  const [project] = await db.delete(projects).where(eq(projects.id, id)).returning();
  return project;
};

export const getProjectTotalTime = async (projectId: string, userId: string) => {
  const result = await db
    .select({
      total: sql<number>`coalesce(sum(${timerSessions.durationSec}), 0)`,
    })
    .from(timerSessions)
    .where(and(eq(timerSessions.projectId, projectId), eq(timerSessions.userId, userId)));

  return result[0]?.total ?? 0;
};

export const getTasksTimeByProjectId = async (projectId: string, userId: string) => {
  return db
    .select({
      taskId: tasks.id,
      title: tasks.title,
      status: tasks.status,
      totalSeconds: sql<number>`coalesce(sum(${timerSessions.durationSec}), 0)`,
    })
    .from(tasks)
    .leftJoin(
      timerSessions,
      and(eq(timerSessions.taskId, tasks.id), eq(timerSessions.userId, userId))
    )
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)))
    .groupBy(tasks.id, tasks.title, tasks.status);
};

// Task Queries
export const getTasksByProjectId = async (projectId: string, userId: string) => {
  return db.query.tasks.findMany({
    where: and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)),
    orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
  });
};

export const createTask = async (data: NewTask) => {
  const [task] = await db.insert(tasks).values(data).returning();
  return task;
};

export const archiveTask = async (id: string, userId: string) => {
  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });
  if (!existing) {
    return null;
  }
  const [task] = await db
    .update(tasks)
    .set({ status: "archived" })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return task;
};

export const deleteTaskById = async (id: string, userId: string) => {
  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });
  if (!existing) return null;

  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  return deleted ?? null;
};

export const deleteAllArchivedTasks = async (userId: string) => {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "archived")))
    .returning({ id: tasks.id });

  return { deletedCount: deleted.length };
};

// Timer Queries
export const getCurrentTimerSession = async (userId: string) => {
  return db.query.timerSessions.findFirst({
    where: and(eq(timerSessions.userId, userId), isNull(timerSessions.endedAt)),
    with: { task: true },
  });
};

export const startTimerSession = async (userId: string, taskId: string, projectId: string) => {
  const existing = await getCurrentTimerSession(userId);
   if (existing) {
     throw new Error("A timer session is already running");
   }
  const [session] = await db.insert(timerSessions)
    .values({
      userId,
      taskId,
      projectId,
      startedAt: new Date(),
    })
    .returning();
    return session;
};

export const stopCurrentTimerSession = async (userId: string, durationSec: number) => {
  const now = new Date();
  const [session] = await db.update(timerSessions)
    .set({ endedAt: now, durationSec, updatedAt: now })
    .where(and(eq(timerSessions.userId, userId), isNull(timerSessions.endedAt)))
    .returning();
  if (!session) {
    throw new Error("No active timer session to stop");
  }
  return session;
};

// Comment Queries
export const createComment = async (data: NewComment) => {
  const [comment] = await db.insert(comments).values(data).returning();
  return comment;
};

export const getCommentById = async (id: string) => {
  return db.query.comments.findFirst({
    where: eq(comments.id, id),
    with: { user: true },
  });
};

export const deleteComment = async (id: string) => {
  const existingComment = await getCommentById(id);
  if (!existingComment) {
    throw new Error(`Comment with id ${id} does not exist`);
  }
  
  const [comment] = await db.delete(comments).where(eq(comments.id, id)).returning();
  return comment;
};

// PomodoroSettings (DB only)
export const getPomodoroSettingsByUserId = async (userId: string) => {
  return db.query.pomodoroSettings.findFirst({
    where: eq(pomodoroSettings.userId, userId),
  });
};

export const createPomodoroSettings = async (userId: string) => {
  const [created] = await db.insert(pomodoroSettings).values({ userId }).returning();
  return created;
};

export const updatePomodoroSettingsByUserId = async (
  userId: string,
  data: Partial<{
    workSec: number;
    breakSec: number;
    longBreakSec: number;
    longBreakEvery: number;
    autoStartNext: boolean;
  }>
) => {
  const [updated] = await db
    .update(pomodoroSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pomodoroSettings.userId, userId))
    .returning();

  return updated ?? null;
};

// PomodoroState (DB only)
export const getPomodoroStateByUserId = async (userId: string) => {
  return db.query.pomodoroState.findFirst({
    where: eq(pomodoroState.userId, userId),
    with: { task: true },
  });
};

export const createPomodoroState = async (userId: string) => {
  const [created] = await db.insert(pomodoroState).values({ userId }).returning();
  return created;
};

export const updatePomodoroStateByUserId = async (
  userId: string,
  data: Partial<{
    phase: "work" | "break" | "longbreak";
    status: "idle" | "running" | "paused";
    taskId: string | null;
    startedAt: Date | null;
    endsAt: Date | null;
    cycleCount: number;
  }>
) => {
  const [updated] = await db
    .update(pomodoroState)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pomodoroState.userId, userId))
    .returning();

  return updated ?? null;
};

// TimerSessions (DB only) - work完了や手動切替の部分保存で使う
export const insertTimerSession = async (data: {
  userId: string;
  taskId: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
}) => {
  const [created] = await db.insert(timerSessions).values(data).returning();
  return created;
};

export const getTaskOwnedByUser = async (taskId: string, userId: string) => {
  return db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });
};
