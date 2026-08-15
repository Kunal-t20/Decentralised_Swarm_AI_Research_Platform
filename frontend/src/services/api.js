import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` 
  : '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Redirect on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email, password) => api.post('/auth/register', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const researchAPI = {
  createJob: (topic) => api.post('/research', { topic }),
  listJobs: () => api.get('/research'),
  getStatus: (jobId, since = 0) => api.get(`/research/${jobId}?since=${since}`),
  getReport: (jobId) => api.get(`/research/${jobId}/report`),
  deleteJob: (jobId) => api.delete(`/research/${jobId}`),
  retryJob: (jobId) => api.post(`/research/${jobId}/retry`),
};

export default api;
