import axios from 'axios';

const API_BASE_URL = '/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;

// API Functions
export const api = {
  // Auth
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; full_name: string }) =>
    client.post('/auth/register', data),

  // Properties
  getProperties: () => client.get('/properties'),
  getProperty: (id: string) => client.get(`/properties/${id}`),
  createProperty: (data: any) => client.post('/properties', data),
  updateProperty: (id: string, data: any) => client.put(`/properties/${id}`, data),

  // Channels
  getChannels: () => client.get('/channels'),

  // Categories
  getCategories: () => client.get('/categories'),

  // Bookings
  getBookings: (params?: any) => client.get('/bookings', { params }),
  getBooking: (id: string) => client.get(`/bookings/${id}`),
  createBooking: (data: any) => client.post('/bookings', data),
  updateBooking: (id: string, data: any) => client.put(`/bookings/${id}`, data),
  deleteBooking: (id: string) => client.delete(`/bookings/${id}`),

  // Expenses
  getExpenses: (params?: any) => client.get('/expenses', { params }),
  getExpense: (id: string) => client.get(`/expenses/${id}`),
  createExpense: (data: any) => client.post('/expenses', data),
  updateExpense: (id: string, data: any) => client.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => client.delete(`/expenses/${id}`),

  // Dashboard
  getKPIs: (propertyId: string, startDate: string, endDate: string) =>
    client.get('/dashboard/kpis', { params: { property_id: propertyId, start_date: startDate, end_date: endDate } }),
  getRevenueTrend: (propertyId: string, year: number) =>
    client.get('/dashboard/revenue-trend', { params: { property_id: propertyId, year } }),
  getChannelMix: (propertyId: string, startDate: string, endDate: string) =>
    client.get('/dashboard/channel-mix', { params: { property_id: propertyId, start_date: startDate, end_date: endDate } }),
  getExpenseBreakdown: (propertyId: string, startDate: string, endDate: string) =>
    client.get('/dashboard/expense-breakdown', { params: { property_id: propertyId, start_date: startDate, end_date: endDate } }),
};
