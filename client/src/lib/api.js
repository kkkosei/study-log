import api from "./axios";

//users api
export const syncUser = async (userData) => {
  const {data} = await api.post("/users/sync", userData);
  return data;
};

//projects api
export const getAllProjects = async () => {
  const {data} = await api.get("/projects");
  return data;
};

export const getProjectById = async (id) => {
  const {data} = await api.get(`/projects/${id}`);
  return data;
};

export const getMyProjects = async () => {
  const {data} = await api.get("/projects/my");
  return data;
};

export const createProject = async (projectData) => {
  const {data} = await api.post("/projects", projectData);
  return data;
};

export const updateProject = async ({id, ...projectData}) => {
  const {data} = await api.put(`/projects/${id}`, projectData);
  return data;
};

export const deleteProject = async (id) => {
  const {data} = await api.delete(`/projects/${id}`);
  return data;
};

export const getProjectSummary = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/summary`);
  return data; // { totalSeconds }
};

export const getProjectTasksSummary = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/tasks-summary`);
  return data; // [{ taskId, title, status, totalSeconds }]
};

// tasks api
export const getTasksByProject = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/tasks`);
  return data;
};

export const createTask = async ({ projectId, title }) => {
  const { data } = await api.post(`/projects/${projectId}/tasks`, { title });
  return data;
};

export const archiveTask = async ({ taskId }) => {
  const { data } = await api.patch(`/tasks/${taskId}/archive`);
  return data; // task | null
};

export const deleteTask = async ({ taskId }) => {
  const { data } = await api.delete(`/tasks/${taskId}`);
  return data; // { ok: true, deletedTaskId }
};

export const deleteArchivedTasksAll = async () => {
  const { data } = await api.delete(`/tasks/archived/all`);
  return data; // { ok: true, deletedCount }
};

// timer api
export const getCurrentTimer = async () => {
  const { data } = await api.get("/timer/current");
  return data; // null | session
};

export const startTimer = async (taskId) => {
  const { data } = await api.post("/timer/start", { taskId });
  return data;
};

export const stopTimer = async () => {
  const { data } = await api.post("/timer/stop");
  return data;
};

//comments api
export const createComment = async ({projectId, content}) => {
  const {data} = await api.post(`/comments/${projectId}`, {content});
  return data;
};

export const deleteComment = async ({commentId}) => {
  const {data} = await api.delete(`/comments/${commentId}`);
  return data;
};

// pomodoro api
export const getPomodoro = async () => {
  const { data } = await api.get("/pomodoro");
  return data; // { settings, state }
};

export const updatePomodoroSettings = async (patch) => {
  const { data } = await api.patch("/pomodoro/settings", patch);
  return data; // settings
};

export const startPomodoro = async ({ taskId } = {}) => {
  const { data } = await api.post("/pomodoro/start", { taskId });
  return data; // state
};

export const pausePomodoro = async () => {
  const { data } = await api.post("/pomodoro/pause");
  return data; // state
};

export const resumePomodoro = async () => {
  const { data } = await api.post("/pomodoro/resume");
  return data; // state
};

export const completePomodoro = async () => {
  const { data } = await api.post("/pomodoro/complete");
  return data; // state
};

export const switchPomodoroPhase = async ({ phase, taskId } = {}) => {
  const { data } = await api.post("/pomodoro/switch", { phase, taskId });
  return data; // state
};
