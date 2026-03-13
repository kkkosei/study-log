// server/src/services/pomodoroService.ts
import * as queries from "../db/queries";

export type PomodoroPhase = "work" | "break" | "longbreak";
export type PomodoroStatus = "idle" | "running" | "paused";

function assertPhase(phase: any): asserts phase is PomodoroPhase {
  if (!["work", "break", "longbreak"].includes(phase)) {
    throw new Error(`Invalid phase: ${String(phase)}`);
  }
}

function getPhaseDurationSec(
  settings: Awaited<ReturnType<typeof ensureSettings>>,
  phase: PomodoroPhase
) {
  if (phase === "work") return settings.workSec;
  if (phase === "break") return settings.breakSec;
  return settings.longBreakSec;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function ensureSettings(userId: string) {
  const existing = await queries.getPomodoroSettingsByUserId(userId);
  if (existing) return existing;
  try {
    return await queries.createPomodoroSettings(userId);
  } catch {
    // Another request may have inserted concurrently
    const retry = await queries.getPomodoroSettingsByUserId(userId);
    if (retry) return retry;
    throw new Error("Failed to initialize pomodoro settings");
  }
}

async function ensureState(userId: string) {
  const existing = await queries.getPomodoroStateByUserId(userId);
  if (existing) return existing;

  await queries.createPomodoroState(userId);
  const created = await queries.getPomodoroStateByUserId(userId);
  if (!created) throw new Error("Failed to initialize pomodoro state");
  return created;
}

export async function getBundle(userId: string) {
  const settings = await ensureSettings(userId);
  const state = await ensureState(userId);
  return { settings, state };
}

export async function updateSettings(
  userId: string,
  data: Partial<{
    workSec: number;
    breakSec: number;
    longBreakSec: number;
    longBreakEvery: number;
    autoStartNext: boolean;
  }>
) {
  if (data.longBreakEvery !== undefined && data.longBreakEvery < 1) {
    throw new Error("longBreakEvery must be at least 1");
  }
  for (const key of ["workSec", "breakSec", "longBreakSec"] as const) {
    if (data[key] !== undefined && data[key]! < 1) {
      throw new Error(`${key} must be at least 1`);
    }
  }
  await ensureSettings(userId);
  const updated = await queries.updatePomodoroSettingsByUserId(userId, data);
  if (!updated) throw new Error("Failed to update settings");
  return updated;
}

export async function start(userId: string, taskId?: string) {
  const settings = await ensureSettings(userId);
  const state = await ensureState(userId);

  if (state.status === "running") return state;

  const phase = state.phase as PomodoroPhase;
  assertPhase(phase);

  const effectiveTaskId = phase === "work" ? (taskId ?? state.taskId ?? null) : null;

  if (phase === "work" && !effectiveTaskId) {
    throw new Error("taskId is required for work phase");
  }

  if (phase === "work" && effectiveTaskId) {
    const owned = await queries.getTaskOwnedByUser(effectiveTaskId, userId);
    if (!owned) throw new Error("Task not found");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + getPhaseDurationSec(settings, phase) * 1000);

  await queries.updatePomodoroStateByUserId(userId, {
    status: "running",
    startedAt: now,
    endsAt,
    taskId: effectiveTaskId,
  });

  const next = await queries.getPomodoroStateByUserId(userId);
  if (!next) throw new Error("Failed to load state");
  return next;
}

export async function pause(userId: string) {
  const state = await ensureState(userId);
  if (state.status !== "running") return state;
  if (!state.startedAt || !state.endsAt) return state;

  const now = new Date();

  // persist partial work time before freezing
  if (state.phase === "work" && state.taskId) {
    const settings = await ensureSettings(userId);
    const startedAt = new Date(state.startedAt);
    const elapsedSecRaw = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
    const elapsedSec = clamp(elapsedSecRaw, 0, settings.workSec);
    if (elapsedSec > 0) {
      const task = await queries.getTaskOwnedByUser(state.taskId, userId);
      if (task) {
        await queries.insertTimerSession({
          userId,
          taskId: state.taskId,
          projectId: task.projectId,
          startedAt,
          endedAt: now,
          durationSec: elapsedSec,
        });
      }
    }
  }

  const remainingSec = Math.max(
    0,
    Math.floor((new Date(state.endsAt).getTime() - now.getTime()) / 1000)
  );

  // freeze remaining
  const frozenEndsAt = new Date(now.getTime() + remainingSec * 1000);

  await queries.updatePomodoroStateByUserId(userId, {
    status: "paused",
    startedAt: now,
    endsAt: frozenEndsAt,
  });

  const next = await queries.getPomodoroStateByUserId(userId);
  if (!next) throw new Error("Failed to load state");
  return next;
}

export async function resume(userId: string) {
  const state = await ensureState(userId);
  if (state.status !== "paused") return state;
  if (!state.startedAt || !state.endsAt) return state;

  const now = new Date();
  const remainingSec = Math.max(
    0,
    Math.floor((new Date(state.endsAt).getTime() - new Date(state.startedAt).getTime()) / 1000)
  );

  const endsAt = new Date(now.getTime() + remainingSec * 1000);

  await queries.updatePomodoroStateByUserId(userId, {
    status: "running",
    startedAt: now,
    endsAt,
  });

  const next = await queries.getPomodoroStateByUserId(userId);
  if (!next) throw new Error("Failed to load state");
  return next;
}

export async function complete(userId: string) {
  const settings = await ensureSettings(userId);
  const state = await ensureState(userId);

  const phase = state.phase as PomodoroPhase;
  assertPhase(phase);

  // Prevent phantom cycle increments when the timer was never started
  if (state.status === "idle" && phase === "work") return state;

  const now = new Date();

  if (phase === "work" && state.status === "running" && state.startedAt && state.taskId) {
    const owned = await queries.getTaskOwnedByUser(state.taskId, userId);
    if (owned) {
      const startedAt = new Date(state.startedAt);
      const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const duration = clamp(elapsed, 0, settings.workSec);

      if (duration > 0) {
        await queries.insertTimerSession({
          userId,
          taskId: state.taskId,
          projectId: owned.projectId,
          startedAt,
          endedAt: now,
          durationSec: duration,
        });
      }
    }
  }

  let nextPhase: PomodoroPhase;
  let nextCycle = state.cycleCount;

  if (phase === "work") {
    nextCycle += 1;

    const isLong =
      nextCycle % settings.longBreakEvery === 0;

    nextPhase = isLong ? "longbreak" : "break";
  } else {
    nextPhase = "work";
  }

  const autoStart =
    nextPhase === "break" || nextPhase === "longbreak"
      ? true
      : settings.autoStartNext;

  const durationSec = getPhaseDurationSec(settings, nextPhase);

  // Re-validate task ownership before auto-starting the next work phase
  if (nextPhase === "work" && state.taskId) {
  const owned = await queries.getTaskOwnedByUser(state.taskId, userId);
    if (!owned) throw new Error("Task not found or no longer owned; switch to a valid task first");
  }

  await queries.updatePomodoroStateByUserId(userId, {
    phase: nextPhase,
    status: autoStart ? "running" : "idle",
    startedAt: autoStart ? now : null,
    endsAt: autoStart
      ? new Date(now.getTime() + durationSec * 1000)
      : null,
    taskId: state.taskId ?? null,
    cycleCount: nextCycle,
  });

  const next = await queries.getPomodoroStateByUserId(userId);
  if (!next) throw new Error("Failed to load state");

  return next;
}


export async function switchPhase(
  userId: string,
  phase: PomodoroPhase,
  taskId?: string
) {
  const settings = await ensureSettings(userId);
  const state = await ensureState(userId);
  assertPhase(phase);

  const now = new Date();

  // leaving running work -> persist partial time
  if (state.status === "running" && state.phase === "work" && state.startedAt && state.taskId) {
    const startedAt = new Date(state.startedAt);
    const elapsedSecRaw = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
    const elapsedSec = clamp(elapsedSecRaw, 0, settings.workSec);

    if (elapsedSec > 0) {
      const task = await queries.getTaskOwnedByUser(state.taskId, userId);
      if (task) {
        await queries.insertTimerSession({
          userId,
          taskId: state.taskId,
          projectId: task.projectId,
          startedAt,
          endedAt: now,
          durationSec: elapsedSec,
        });
      }
    }
  }

  const effectiveTaskId = phase === "work" ? (taskId ?? state.taskId ?? null) : null;
  if (phase === "work" && !effectiveTaskId) throw new Error("taskId is required for work phase");

  if (phase === "work" && effectiveTaskId) {
    const owned = await queries.getTaskOwnedByUser(effectiveTaskId, userId);
    if (!owned) throw new Error("Task not found");
  }

  const endsAt = new Date(now.getTime() + getPhaseDurationSec(settings, phase) * 1000);

  await queries.updatePomodoroStateByUserId(userId, {
    phase,
    status: "running",
    startedAt: now,
    endsAt,
    taskId: effectiveTaskId,
  });

  const next = await queries.getPomodoroStateByUserId(userId);
  if (!next) throw new Error("Failed to load state");
  return next;
}
