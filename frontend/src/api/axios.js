import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      // Do not clear token automatically here to avoid redirect loops on initial loads.
      // Let the caller/route guard decide what to do.
    }
    return Promise.reject(error);
  }
);

export default api;
