import axiosInstance from './axios';

// Auth Services
export const authService = {
  login: (username, password) => 
    axiosInstance.post('/api/login/', { username, password }),
  
  logout: () => 
    axiosInstance.post('/api/logout/'),
};

// Project Services
export const projectService = {
  getAll: () => axiosInstance.get('/api/projects/'),
  getById: (id) => axiosInstance.get(`/api/projects/${id}/`),
  create: (data) => axiosInstance.post('/api/projects/', data),
  update: (id, data) => axiosInstance.patch(`/api/projects/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/api/projects/${id}/`),
};

// Task Services
export const taskService = {
  getAll: () => axiosInstance.get('/api/tasks/'),
  getById: (id) => axiosInstance.get(`/api/tasks/${id}/`),
  create: (data) => axiosInstance.post('/api/tasks/', data),
  update: (id, data) => axiosInstance.patch(`/api/tasks/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/api/tasks/${id}/`),
};

// Working Day Services
export const workingDayService = {
  getAll: () => axiosInstance.get('/api/working-days/'),
  checkIn: () => axiosInstance.post('/api/working-days/', {}),
  checkOut: (id) => axiosInstance.post(`/api/working-days/${id}/check_out/`),
  leave: (id) => axiosInstance.post(`/api/working-days/${id}/leave/`),
};

// Report Services
export const reportService = {
  getByWorkingDay: (workingDayId) => 
    axiosInstance.get(`/api/working-days/${workingDayId}/reports/`),
  create: (workingDayId, data) => 
    axiosInstance.post(`/api/working-days/${workingDayId}/reports/`, data),
  update: (workingDayId, reportId, data) => 
    axiosInstance.patch(`/api/working-days/${workingDayId}/reports/${reportId}/`, data),
  delete: (workingDayId, reportId) => 
    axiosInstance.delete(`/api/working-days/${workingDayId}/reports/${reportId}/`),
};

// Feedback Services
export const feedbackService = {
  getAll: () => axiosInstance.get('/api/feedbacks/'),
  create: (data) => axiosInstance.post('/api/feedbacks/', data),
  update: (id, data) => axiosInstance.patch(`/api/feedbacks/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/api/feedbacks/${id}/`),
};
