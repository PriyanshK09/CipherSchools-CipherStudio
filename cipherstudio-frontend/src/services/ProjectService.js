import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

let authToken = null;

const setAuthToken = (token) => {
  authToken = token ?? null;
};

api.interceptors.request.use((config) => {
  let token = authToken;
  if (!token && typeof window !== "undefined") {
    token = window.localStorage.getItem("cipherstudio.authToken");
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleResponse = (promise) => promise.then((response) => response.data);

export const register = (payload) => handleResponse(api.post("/users", payload));
export const login = (payload) => handleResponse(api.post("/users/login", payload));
export const createProject = (payload) => handleResponse(api.post("/projects", payload));
export const fetchProjects = (userId) => handleResponse(api.get(`/projects/user/${userId}`));
export const fetchProjectById = (id) => handleResponse(api.get(`/projects/${id}`));
export const updateProject = (id, payload) => handleResponse(api.put(`/projects/${id}`, payload));
export const deleteProject = (id) => handleResponse(api.delete(`/projects/${id}`));
export const createFileEntry = (payload) => handleResponse(api.post("/files", payload));
export const updateFileEntry = (id, payload) => handleResponse(api.put(`/files/${id}`, payload));
export const deleteFileEntry = (id) => handleResponse(api.delete(`/files/${id}`));
export const cloneFromUrl = (payload) => handleResponse(api.post(`/projects/clone`, payload));

export default {
  register,
  login,
  createProject,
  fetchProjects,
  fetchProjectById,
  updateProject,
  deleteProject,
  createFileEntry,
  updateFileEntry,
  deleteFileEntry,
  cloneFromUrl,
  // Collaborator endpoints (backend must support these)
  addCollaborator: (projectId, payload) => handleResponse(api.post(`/projects/${projectId}/collaborators`, payload)),
  removeCollaborator: (projectId, userId) => handleResponse(api.delete(`/projects/${projectId}/collaborators/${userId}`)),
  fetchCollaborators: (projectId) => handleResponse(api.get(`/projects/${projectId}/collaborators`)),
  setAuthToken
};

export { setAuthToken };
