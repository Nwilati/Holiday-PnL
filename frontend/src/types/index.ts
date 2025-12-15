export type Property = {
  id: string;
  name: string;
  property_type: string;
  address_line1: string;
  area: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  is_active: boolean;
};

export type Channel = {
  id: string;
  code: string;
  name: string;
  commission_rate: number;
  color_hex: string;
  is_active: boolean;
};

export type Category = {
  id: string;
  code: string;
  name: string;
  parent_code: string;
  category_type: string;
  cost_type: string;
};

export type Booking = {
  id: string;
  property_id: string;
  channel_id: string;
  booking_ref: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  nights: number;
  status: string;
  nightly_rate: number;
  gross_revenue: number;
  net_revenue: number;
  cleaning_fee: number;
  platform_commission: number;
  is_paid: boolean;
  created_at: string;
};

export type Expense = {
  id: string;
  property_id: string;
  category_id: string;
  expense_date: string;
  vendor: string;
  description: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string;
  is_paid: boolean;
  created_at: string;
};

export type DashboardKPIs = {
  total_revenue: number;
  net_revenue: number;
  total_expenses: number;
  noi: number;
  occupancy_rate: number;
  adr: number;
  revpar: number;
  total_bookings: number;
  total_nights: number;
  expense_ratio: number;
};
