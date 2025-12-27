import api from './axios';
import axios from 'axios';

export const login = (payload) => api.post('/api/auth/login', payload);
export const register = (payload) => api.post('/api/auth/signup', payload);
export const verifyEmail = (token) => api.get('/api/auth/verify-email', { params: { token } });
export const forgotPassword = (email) => api.post('/api/auth/forgot-password', null, { params: { email } });
export const resetPassword = (token, newPassword) => api.post('/api/auth/reset-password', null, { params: { token, newPassword } });
export const getCategories = () => api.get('/api/categories');
export const addExpense = async (payload) => {
  const res = await api.post('/api/expenses', payload);
  try { window.dispatchEvent(new CustomEvent('expenses:changed')); } catch {}
  return res;
}
export const getExpenses = (params) => api.get('/api/expenses', { params });
export const updateExpense = async (id, payload) => {
  const res = await api.put(`/api/expenses/${id}`, payload);
  try { window.dispatchEvent(new CustomEvent('expenses:changed')); } catch {}
  return res;
}
export const deleteExpense = async (id) => {
  const res = await api.delete(`/api/expenses/${id}`);
  try { window.dispatchEvent(new CustomEvent('expenses:changed')); } catch {}
  return res;
}
export const createCategory = (name) => api.post('/api/categories', { name });
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);
export const setBudget = (amount) => api.post('/api/budget', { amount });
export const getCurrentBudget = () => api.get('/api/budget/current');
export const getBudgetStatus = (month) => api.get('/api/budget/status', { params: month ? { month } : undefined });
export const getBudgetHistory = (from, to) => api.get('/api/budget/history', { params: { from, to } });
export const getBudgetBreakdown = (month) => api.get('/api/budget/breakdown', { params: { month } });

export const getFinanceInsights = (payload) => {
  const baseURL = import.meta.env.VITE_INSIGHTS_API_URL || "http://localhost:8000";
  return axios.post(`${baseURL}/finance-insights`, payload);
};