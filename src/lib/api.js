import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const listFirefighters = () => api.get("/firefighters").then((r) => r.data);
export const createFirefighter = (payload) => api.post("/firefighters", payload).then((r) => r.data);
export const deleteFirefighter = (id) => api.delete(`/firefighters/${id}`).then((r) => r.data);

export const listRotas = (status) =>
    api.get("/rotas", { params: status ? { status } : {} }).then((r) => r.data);
export const createRota = (payload) => api.post("/rotas", payload).then((r) => r.data);
export const addReading = (rotaId, payload) =>
    api.post(`/rotas/${rotaId}/readings`, payload).then((r) => r.data);
export const finishRota = (rotaId) => api.post(`/rotas/${rotaId}/finish`).then((r) => r.data);
export const deleteRota = (rotaId) => api.delete(`/rotas/${rotaId}`).then((r) => r.data);
