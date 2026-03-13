import { pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";


export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date() ),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade"}),
  title: text("title").notNull(),
  status: text("status").notNull().default("todo"),
  createdAt: timestamp("created_at", {mode: "date"})
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const timerSessions = pgTable("timer_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "set null" }),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  endedAt: timestamp("ended_at", { mode: "date" }),
  durationSec: integer("duration_sec")
    .notNull()
    .default(0),
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),

});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects
    .id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const pomodoroState = pgTable("pomodoro_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  phase: text("phase").notNull().default("work"), 
  // "work" | "break" | "longbreak"

  status: text("status").notNull().default("idle"), 
  // "idle" | "running" | "paused"

  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),

  startedAt: timestamp("started_at", { mode: "date" }),
  endsAt: timestamp("ends_at", { mode: "date" }),

  cycleCount: integer("cycle_count").notNull().default(0),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const pomodoroSettings = pgTable("pomodoro_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  workSec: integer("work_sec").notNull().default(25 * 60),
  breakSec: integer("break_sec").notNull().default(5 * 60),
  longBreakSec: integer("long_break_sec").notNull().default(15 * 60),

  longBreakEvery: integer("long_break_every").notNull().default(5),

  autoStartNext: boolean("auto_start_next").notNull().default(false),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});


// Define relations
export const userRelations = relations(users, ({ one, many }) => ({
  projects: many(projects),
  comments: many(comments),
  tasks: many(tasks),
  timerSessions: many(timerSessions),
  pomodoroSettings: one(pomodoroSettings),
  pomodoroState: one(pomodoroState),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  // fields: for the foreign key columns 
  // references: for the primary key columns
  // if user is named differently, then we use (with: {user123: true}) in queries.ts
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  comments: many(comments),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  timerSessions: many(timerSessions),
  pomodoroState: one(pomodoroState),
}));

export const timerSessionsRelations = relations(timerSessions, ({ one }) => ({
  user: one(users, {
    fields: [timerSessions.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [timerSessions.taskId],
    references: [tasks.id],
  }),
  project: one(projects, {
    fields: [timerSessions.projectId],
    references: [projects.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one}) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  project: one(projects, { fields: [comments.projectId], references: [projects.id] }),
}));

export const pomodoroSettingsRelations = relations(pomodoroSettings, ({ one }) => ({
  user: one(users, {
    fields: [pomodoroSettings.userId],
    references: [users.id],
  }),
}));

export const pomodoroStateRelations = relations(pomodoroState, ({ one }) => ({
  user: one(users, {
    fields: [pomodoroState.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [pomodoroState.taskId],
    references: [tasks.id],
  }),
}));


//Type inferences
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TimerSession = typeof timerSessions.$inferSelect;
export type NewTimerSession = typeof timerSessions.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type PomodoroSettings = typeof pomodoroSettings.$inferSelect;
export type NewPomodoroSettings = typeof pomodoroSettings.$inferInsert;

export type PomodoroState = typeof pomodoroState.$inferSelect;
export type NewPomodoroState = typeof pomodoroState.$inferInsert;