import axiosInstance from './axios';

// Auth Services
export const authService = {
  login: (username, password) => 
    axiosInstance.post('/login/', { username, password }),
  
  logout: () => 
    axiosInstance.post('/logout/'),
  
  getCurrentUser: () => 
    axiosInstance.get('/current-user/'),
};

// Project Services
export const projectService = {
  getAll: () => axiosInstance.get('/projects/'),
  getById: (id) => axiosInstance.get(`/projects/${id}/`),
  create: (data) => axiosInstance.post('/projects/', data),
  update: (id, data) => axiosInstance.patch(`/projects/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/projects/${id}/`),
};

// Task Services
export const taskService = {
  getAll: () => axiosInstance.get('/tasks/'),
  getById: (id) => axiosInstance.get(`/tasks/${id}/`),
  create: (data) => axiosInstance.post('/tasks/', data),
  update: (id, data) => axiosInstance.patch(`/tasks/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/tasks/${id}/`),
};

// Working Day Services
export const workingDayService = {
  getAll: () => axiosInstance.get('/working-days/'),
  checkIn: () => axiosInstance.post('/working-days/', {}),
  checkOut: (id) => axiosInstance.post(`/working-days/${id}/check_out/`),
  leave: (id) => axiosInstance.post(`/working-days/${id}/leave/`),
};

// Report Services
export const reportService = {
  getByWorkingDay: (workingDayId) => 
    axiosInstance.get(`/working-days/${workingDayId}/reports/`),
  create: (workingDayId, data) => 
    axiosInstance.post(`/working-days/${workingDayId}/reports/`, data),
  update: (workingDayId, reportId, data) => 
    axiosInstance.patch(`/working-days/${workingDayId}/reports/${reportId}/`, data),
  delete: (workingDayId, reportId) => 
    axiosInstance.delete(`/working-days/${workingDayId}/reports/${reportId}/`),
};

// Feedback Services
export const feedbackService = {
  getAll: () => axiosInstance.get('/feedbacks/'),
  create: (data) => axiosInstance.post('/feedbacks/', data),
  update: (id, data) => axiosInstance.patch(`/feedbacks/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/feedbacks/${id}/`),
};

// Admin Services
export const adminService = {
  // User Management
  getAllUsers: () => axiosInstance.get('/users/'),
  getUserById: (id) => axiosInstance.get(`/users/${id}/`),
  createUser: (data) => axiosInstance.post('/users/', data),
  updateUser: (id, data) => axiosInstance.patch(`/users/${id}/`, data),
  deleteUser: (id) => axiosInstance.delete(`/users/${id}/`),
  
  // Statistics
  getStatistics: () => axiosInstance.get('/admin/statistics/'),
  
  // Organizational Dashboard
  getOrganizationalDashboard: () => axiosInstance.get('/admin/organizational-dashboard/'),
  
  // System Logs
  getSystemLogs: () => axiosInstance.get('/admin/system-logs/'),
  
  // Settings
  getSettings: () => axiosInstance.get('/admin/settings/'),
  updateSettings: (data) => axiosInstance.post('/admin/settings/', data),
};
