import axiosInstance from './axios';

// Auth Services
export const authService = {
  login: (username, password) => 
    axiosInstance.post('/login/', { username, password }),
  
  logout: () => 
    axiosInstance.post('/logout/'),
  
  getCurrentUser: () => 
    axiosInstance.get('/current-user/'),
  
  updateProfile: (data) => {
    // Axios will automatically handle FormData and set Content-Type with boundary
    // The interceptor will remove the default Content-Type for FormData
    return axiosInstance.patch('/current-user/', data);
  },
};

// Project Services
export const projectService = {
  getAll: (params = {}) => axiosInstance.get('/projects/', { params }),
  getById: (id) => axiosInstance.get(`/projects/${id}/`),
  create: (data) => axiosInstance.post('/projects/', data),
  update: (id, data) => axiosInstance.patch(`/projects/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/projects/${id}/`),
};

// Task Services
export const taskService = {
  getAll: (params = {}) => axiosInstance.get('/tasks/', { params }),
  getById: (id) => axiosInstance.get(`/tasks/${id}/`),
  create: (data) => axiosInstance.post('/tasks/', data),
  update: (id, data) => axiosInstance.patch(`/tasks/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/tasks/${id}/`),
};

// Working Day Services
export const workingDayService = {
  getAll: (params = {}) => axiosInstance.get('/working-days/', { params }),
  checkIn: () => axiosInstance.post('/working-days/', {}),
  checkOut: (id) => axiosInstance.post(`/working-days/${id}/check_out/`),
  leave: (id) => axiosInstance.post(`/working-days/${id}/leave/`),
};

// Report Services
export const reportService = {
  getByWorkingDay: (workingDayId, params = {}) => 
    axiosInstance.get(`/working-days/${workingDayId}/reports/`, { params }),
  create: (workingDayId, data) => 
    axiosInstance.post(`/working-days/${workingDayId}/reports/`, data),
  update: (workingDayId, reportId, data) => 
    axiosInstance.patch(`/working-days/${workingDayId}/reports/${reportId}/`, data),
  delete: (workingDayId, reportId) => 
    axiosInstance.delete(`/working-days/${workingDayId}/reports/${reportId}/`),
};

// Feedback Services
export const feedbackService = {
  getAll: (params = {}) => axiosInstance.get('/feedbacks/', { params }),
  create: (data) => axiosInstance.post('/feedbacks/', data),
  update: (id, data) => axiosInstance.patch(`/feedbacks/${id}/`, data),
  delete: (id) => axiosInstance.delete(`/feedbacks/${id}/`),
};

// Admin Services
export const adminService = {
  // User Management
  getAllUsers: (params = {}) => axiosInstance.get('/users/', { params }),
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
