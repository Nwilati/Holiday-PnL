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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TenancyCheque {
  id: string;
  tenancy_id: string;
  payment_method?: 'cheque' | 'bank_transfer' | 'cash';
  cheque_number?: string;
  bank_name?: string;
  reference_number?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'deposited' | 'cleared' | 'bounced';
  deposited_date?: string;
  cleared_date?: string;
  bounce_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TenancyDocument {
  id: string;
  tenancy_id: string;
  document_type: 'contract' | 'emirates_id' | 'passport' | 'trade_license' | 'other';
  filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}

export interface Tenancy {
  id: string;
  property_id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  contract_start: string;
  contract_end: string;
  annual_rent: number;
  contract_value: number;
  security_deposit: number;
  num_cheques: 0 | 1 | 2 | 3 | 4 | 6 | 12;
  ejari_number?: string;
  status: 'active' | 'expired' | 'terminated' | 'renewed';
  previous_tenancy_id?: string;
  termination_date?: string;
  termination_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  cheques?: TenancyCheque[];
  documents?: TenancyDocument[];
  property_name?: string;
}

export interface TenancyCreateInput {
  property_id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  contract_start: string;
  contract_end: string;
  annual_rent: number;
  contract_value: number;
  security_deposit?: number;
  num_cheques: 0 | 1 | 2 | 3 | 4 | 6 | 12;
  ejari_number?: string;
  notes?: string;
  cheques?: {
    cheque_number: string;
    bank_name: string;
    amount: number;
    due_date: string;
  }[];
  auto_split_cheques?: boolean;
}

export interface TenancyRenewInput {
  contract_start: string;
  contract_end: string;
  annual_rent: number;
  contract_value: number;
  security_deposit?: number;
  num_cheques: 0 | 1 | 2 | 3 | 4 | 6 | 12;
  ejari_number?: string;
  notes?: string;
  cheques?: {
    cheque_number: string;
    bank_name: string;
    amount: number;
    due_date: string;
  }[];
  auto_split_cheques?: boolean;
}

export interface UpcomingCheque {
  id: string;
  tenancy_id: string;
  property_id: string;
  property_name: string;
  tenant_name: string;
  payment_method?: 'cheque' | 'bank_transfer' | 'cash';
  cheque_number?: string;
  bank_name?: string;
  reference_number?: string;
  amount: number;
  due_date: string;
  status: string;
  days_until_due: number;
}

export interface UpcomingChequesResponse {
  cheques: UpcomingCheque[];
  total_amount: number;
  count: number;
}

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

  // Dashboard - Enhanced
  getAlerts: (propertyId?: string) =>
    axiosInstance.get('/dashboard/alerts', { params: propertyId ? { property_id: propertyId } : {} }),

  getYoyComparison: (propertyId?: string, year?: number) =>
    axiosInstance.get('/dashboard/yoy-comparison', {
      params: {
        ...(propertyId && { property_id: propertyId }),
        ...(year && { year })
      }
    }),

  getRevenueTrendAll: (year: number) =>
    axiosInstance.get('/dashboard/revenue-trend-all', { params: { year } }),

  getExpenseBreakdownAll: (startDate: string, endDate: string) =>
    axiosInstance.get('/dashboard/expense-breakdown-all', { params: { start_date: startDate, end_date: endDate } }),

  getPropertyROI: (year?: number) =>
    axiosInstance.get('/dashboard/property-roi', { params: year ? { year } : {} }),

  getDetailedExpenseReport: (propertyId: string, startDate: string, endDate: string, isPaid?: boolean) =>
    axiosInstance.get('/expenses/report/detailed', {
      params: {
        property_id: propertyId,
        start_date: startDate,
        end_date: endDate,
        ...(isPaid !== undefined && { is_paid: isPaid })
      }
    }),

  // Receipts
  getReceipts: (expenseId: string) => axiosInstance.get(`/receipts/${expenseId}`),
  uploadReceipt: (expenseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`/receipts/${expenseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadMultipleReceipts: (expenseId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return axiosInstance.post(`/receipts/${expenseId}/multiple`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteReceipt: (expenseId: string, receiptId: string) =>
    axiosInstance.delete(`/receipts/${expenseId}/${receiptId}`),
  deleteAllReceipts: (expenseId: string) => axiosInstance.delete(`/receipts/${expenseId}`),

  // User Management (Admin only)
  getUsers: () => axiosInstance.get('/auth/users'),
  createUser: (data: { email: string; password: string; full_name?: string; role: string }) =>
    axiosInstance.post('/auth/register', data),
  updateUser: (userId: string, data: { email: string; password?: string; full_name?: string; role: string }) =>
    axiosInstance.put(`/auth/users/${userId}`, data),
  deleteUser: (userId: string) => axiosInstance.delete(`/auth/users/${userId}`),

  // ============================================================================
  // TENANCY API METHODS
  // ============================================================================

  // Tenancies - CRUD
  getTenancies: (params?: { property_id?: string; status?: string }) =>
    axiosInstance.get<Tenancy[]>('/tenancies', { params }),

  getTenancy: (id: string) =>
    axiosInstance.get<Tenancy>(`/tenancies/${id}`),

  createTenancy: (data: TenancyCreateInput) =>
    axiosInstance.post<Tenancy>('/tenancies', data),

  updateTenancy: (id: string, data: Partial<TenancyCreateInput>) =>
    axiosInstance.put<Tenancy>(`/tenancies/${id}`, data),

  deleteTenancy: (id: string) =>
    axiosInstance.delete(`/tenancies/${id}`),

  // Tenancy Lifecycle
  terminateTenancy: (id: string, data: { termination_date: string; termination_reason: string }) =>
    axiosInstance.post<Tenancy>(`/tenancies/${id}/terminate`, data),

  renewTenancy: (id: string, data: TenancyRenewInput) =>
    axiosInstance.post<Tenancy>(`/tenancies/${id}/renew`, data),

  // Cheque Management
  getTenancyCheques: (tenancyId: string) =>
    axiosInstance.get<TenancyCheque[]>(`/tenancies/${tenancyId}/cheques`),

  updateCheque: (tenancyId: string, chequeId: string, data: Partial<TenancyCheque>) =>
    axiosInstance.put<TenancyCheque>(`/tenancies/${tenancyId}/cheques/${chequeId}`, data),

  // Document Management
  getTenancyDocuments: (tenancyId: string) =>
    axiosInstance.get<TenancyDocument[]>(`/tenancies/${tenancyId}/documents`),

  uploadTenancyDocument: (tenancyId: string, data: {
    document_type: string;
    filename: string;
    file_data: string;
    file_size?: number;
    mime_type?: string;
  }) => axiosInstance.post<TenancyDocument>(`/tenancies/${tenancyId}/documents`, data),

  getTenancyDocument: (tenancyId: string, documentId: string) =>
    axiosInstance.get<TenancyDocument & { file_data: string }>(`/tenancies/${tenancyId}/documents/${documentId}`),

  deleteTenancyDocument: (tenancyId: string, documentId: string) =>
    axiosInstance.delete(`/tenancies/${tenancyId}/documents/${documentId}`),

  // Dashboard - Upcoming Cheques
  getUpcomingCheques: (params?: { property_id?: string; days?: number }) =>
    axiosInstance.get<UpcomingChequesResponse>('/tenancies/dashboard/upcoming-cheques', { params }),

  // Dashboard - Annual Revenue
  getAnnualRevenue: (params?: { property_id?: string; start_date?: string; end_date?: string }) =>
    axiosInstance.get<AnnualRevenueResponse>('/tenancies/dashboard/annual-revenue', { params }),

  // Direct Cheque Operations (by cheque ID only)
  depositCheque: (chequeId: string, data: { deposited_date: string }) =>
    axiosInstance.post<TenancyCheque>(`/tenancies/cheques/${chequeId}/deposit`, data),

  clearCheque: (chequeId: string, data: { cleared_date: string }) =>
    axiosInstance.post<TenancyCheque>(`/tenancies/cheques/${chequeId}/clear`, data),

  bounceCheque: (chequeId: string, data: { bounce_reason: string }) =>
    axiosInstance.post<TenancyCheque>(`/tenancies/cheques/${chequeId}/bounce`, data),

  // Direct Document Operations (by document ID only)
  getDocument: (documentId: string) =>
    axiosInstance.get<TenancyDocument & { file_data: string }>(`/tenancies/documents/${documentId}`),

  deleteDocument: (documentId: string) =>
    axiosInstance.delete(`/tenancies/documents/${documentId}`),

  // ============================================================================
  // OFF-PLAN API METHODS
  // ============================================================================

  // Off-Plan Properties
  getOffplanProperties: (params?: { status?: string; emirate?: string; developer?: string }) =>
    axiosInstance.get<OffplanProperty[]>('/offplan/properties', { params }),

  getOffplanProperty: (id: string) =>
    axiosInstance.get<OffplanProperty>(`/offplan/properties/${id}`),

  createOffplanProperty: (data: OffplanPropertyCreate) =>
    axiosInstance.post<OffplanProperty>('/offplan/properties', data),

  updateOffplanProperty: (id: string, data: Partial<OffplanPropertyCreate>) =>
    axiosInstance.put<OffplanProperty>(`/offplan/properties/${id}`, data),

  deleteOffplanProperty: (id: string) =>
    axiosInstance.delete(`/offplan/properties/${id}`),

  // Off-Plan Payments
  getOffplanPayments: (propertyId: string) =>
    axiosInstance.get<OffplanPayment[]>(`/offplan/properties/${propertyId}/payments`),

  addOffplanPayment: (propertyId: string, data: OffplanPaymentCreate) =>
    axiosInstance.post<OffplanPayment>(`/offplan/properties/${propertyId}/payments`, data),

  updateOffplanPayment: (paymentId: string, data: Partial<OffplanPayment>) =>
    axiosInstance.put<OffplanPayment>(`/offplan/payments/${paymentId}`, data),

  deleteOffplanPayment: (paymentId: string) =>
    axiosInstance.delete(`/offplan/payments/${paymentId}`),

  markOffplanPaymentPaid: (paymentId: string, params: { paid_date: string; paid_amount: number; payment_method?: string; payment_reference?: string }) =>
    axiosInstance.post<OffplanPayment>(`/offplan/payments/${paymentId}/mark-paid`, null, { params }),

  // Off-Plan Documents
  getOffplanDocuments: (propertyId: string) =>
    axiosInstance.get<OffplanDocument[]>(`/offplan/properties/${propertyId}/documents`),

  uploadOffplanDocument: (propertyId: string, data: { document_type: string; document_name: string; file_data: string; file_size?: number; mime_type?: string }) =>
    axiosInstance.post<OffplanDocument>(`/offplan/properties/${propertyId}/documents`, data),

  getOffplanDocument: (documentId: string) =>
    axiosInstance.get<OffplanDocument & { file_data: string }>(`/offplan/documents/${documentId}`),

  deleteOffplanDocument: (documentId: string) =>
    axiosInstance.delete(`/offplan/documents/${documentId}`),

  // Off-Plan Dashboard
  getUpcomingOffplanPayments: (params?: { days?: number }) =>
    axiosInstance.get<UpcomingOffplanPaymentsResponse>('/offplan/dashboard/upcoming-payments', { params }),

  getOffplanInvestmentSummary: () =>
    axiosInstance.get<OffplanInvestmentSummary>('/offplan/dashboard/summary'),
};

export interface AnnualRevenueResponse {
  total_cleared: number;
  total_pending: number;
  total_contract_value: number;
  active_tenancies: number;
}

// ============================================================================
// OFF-PLAN PROPERTY TYPES
// ============================================================================

export interface OffplanPayment {
  id: string;
  offplan_property_id: string;
  installment_number: number;
  milestone_name: string;
  percentage: number;
  amount: number;
  due_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_date?: string;
  paid_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OffplanDocument {
  id: string;
  offplan_property_id: string;
  document_type: string;
  document_name: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}

export interface OffplanProperty {
  id: string;
  developer: string;
  project_name: string;
  unit_number: string;
  reference_number?: string;
  unit_type?: string;
  unit_model?: string;
  internal_area_sqm?: number;
  balcony_area_sqm?: number;
  total_area_sqm?: number;
  floor_number?: number;
  building_number?: string;
  bedrooms: number;
  bathrooms?: number;
  parking_spots: number;
  emirate: 'abu_dhabi' | 'dubai' | 'sharjah' | 'ajman' | 'ras_al_khaimah' | 'fujairah' | 'umm_al_quwain';
  area?: string;
  community?: string;
  base_price: number;
  land_dept_fee_percent?: number;
  land_dept_fee?: number;
  admin_fees: number;
  other_fees: number;
  total_cost?: number;
  purchase_date?: string;
  expected_handover?: string;
  actual_handover?: string;
  status: 'active' | 'handed_over' | 'cancelled';
  converted_property_id?: string;
  promotion_name?: string;
  amc_waiver_years?: number;
  dlp_waiver_years?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  payments?: OffplanPayment[];
  documents?: OffplanDocument[];
  total_paid?: number;
  remaining?: number;
  paid_percentage?: number;
  next_payment_date?: string;
  next_payment_amount?: number;
}

export interface OffplanPaymentCreate {
  installment_number: number;
  milestone_name: string;
  percentage: number;
  amount: number;
  due_date?: string;
}

export interface OffplanPropertyCreate {
  developer: string;
  project_name: string;
  unit_number: string;
  reference_number?: string;
  unit_type?: string;
  unit_model?: string;
  internal_area_sqm?: number;
  balcony_area_sqm?: number;
  total_area_sqm?: number;
  floor_number?: number;
  building_number?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking_spots?: number;
  emirate?: 'abu_dhabi' | 'dubai' | 'sharjah' | 'ajman' | 'ras_al_khaimah' | 'fujairah' | 'umm_al_quwain';
  area?: string;
  community?: string;
  base_price: number;
  land_dept_fee_percent?: number;
  admin_fees?: number;
  other_fees?: number;
  purchase_date?: string;
  expected_handover?: string;
  promotion_name?: string;
  amc_waiver_years?: number;
  dlp_waiver_years?: number;
  notes?: string;
  payments?: OffplanPaymentCreate[];
}

export interface UpcomingOffplanPayment {
  payment_id: string;
  property_id: string;
  developer: string;
  project_name: string;
  unit_number: string;
  emirate: string;
  installment_number: number;
  milestone_name: string;
  percentage: number;
  amount: number;
  due_date: string;
  days_until_due: number;
  status: string;
}

export interface UpcomingOffplanPaymentsResponse {
  payments: UpcomingOffplanPayment[];
  total_amount: number;
  count: number;
}

export interface OffplanInvestmentSummary {
  total_properties: number;
  total_investment: number;
  total_paid: number;
  total_remaining: number;
  overall_paid_percentage: number;
  pending_payments_count: number;
  overdue_payments_count: number;
  payments_due_30_days: number;
  by_emirate: Record<string, { count: number; value: number }>;
  by_developer: Record<string, { count: number; value: number }>;
}

export { api };
export default api;
