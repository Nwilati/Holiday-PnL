import axios from 'axios';

const API_BASE_URL = 'https://holiday-pnl-production.up.railway.app/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
const api = {
  // Base axios methods
  get: axiosInstance.get.bind(axiosInstance),
  post: axiosInstance.post.bind(axiosInstance),
  put: axiosInstance.put.bind(axiosInstance),
  delete: axiosInstance.delete.bind(axiosInstance),

  // Properties
  getProperties: () => axiosInstance.get('/properties'),
  createProperty: (data: any) => axiosInstance.post('/properties', data),
  updateProperty: (id: string, data: any) => axiosInstance.put(`/properties/${id}`, data),
  deleteProperty: (id: string) => axiosInstance.delete(`/properties/${id}`),

  // Bookings
  getBookings: (params?: any) => axiosInstance.get('/bookings', { params }),
  createBooking: (data: any) => axiosInstance.post('/bookings', data),
  updateBooking: (id: string, data: any) => axiosInstance.put(`/bookings/${id}`, data),
  deleteBooking: (id: string) => axiosInstance.delete(`/bookings/${id}`),

  // Expenses
  getExpenses: (params?: any) => axiosInstance.get('/expenses', { params }),
  createExpense: (data: any) => axiosInstance.post('/expenses', data),
  updateExpense: (id: string, data: any) => axiosInstance.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => axiosInstance.delete(`/expenses/${id}`),

  // Channels
  getChannels: () => axiosInstance.get('/channels'),

  // Categories
  getCategories: () => axiosInstance.get('/categories'),

  // Dashboard - accept propertyId, startDate, endDate as separate args
  getKPIs: (propertyId: string, startDate: string, endDate: string) =>
    axiosInstance.get('/dashboard/kpis', { params: { property_id: propertyId, start_date: startDate, end_date: endDate } }),
  getRevenueTrend: (propertyId: string, year: number) =>
    axiosInstance.get('/dashboard/revenue-trend', { params: { property_id: propertyId, year } }),
  getChannelMix: (propertyId: string, startDate: string, endDate: string) =>
    axiosInstance.get('/dashboard/channel-mix', { params: { property_id: propertyId, start_date: startDate, end_date: endDate } }),
  getExpenseBreakdown: (propertyId: string, startDate: string, endDate: string) =>
    axiosInstance.get('/dashboard/expense-breakdown', { params: { property_id: propertyId, start_date: startDate, end_date: endDate } }),

  // Receipts
  uploadReceipt: (expenseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`/receipts/${expenseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteReceipt: (expenseId: string) => axiosInstance.delete(`/receipts/${expenseId}`),
  getReceiptUrl: (expenseId: string) => `${API_BASE_URL}/receipts/${expenseId}/download`,
};

export { api };
export default api;
