-- ============================================================================
-- HOLIDAY HOME P&L MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Version: 1.0.0
-- Created: 2025-12-15
-- Database: PostgreSQL 15+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Booking status lifecycle
CREATE TYPE booking_status AS ENUM (
    'inquiry',
    'pending',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
    'no_show'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'bank_transfer',
    'online_payment',
    'platform_payout',
    'other'
);

-- Expense cost types
CREATE TYPE cost_type AS ENUM (
    'fixed',
    'variable',
    'one_time',
    'capital'
);

-- Calendar block reasons
CREATE TYPE block_reason AS ENUM (
    'owner_stay',
    'maintenance',
    'renovation',
    'long_term_rental',
    'seasonal_closure',
    'other'
);

-- User roles
CREATE TYPE user_role AS ENUM (
    'owner',
    'accountant',
    'operator',
    'viewer'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS & AUTHENTICATION
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- PROPERTIES
-- ----------------------------------------------------------------------------
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    property_type VARCHAR(100), -- apartment, villa, studio, etc.
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    area VARCHAR(100), -- Dubai Marina, Downtown, etc.
    city VARCHAR(100) DEFAULT 'Dubai',
    country VARCHAR(100) DEFAULT 'UAE',
    
    -- Property Details
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms DECIMAL(3,1) DEFAULT 1,
    max_guests INTEGER NOT NULL DEFAULT 2,
    size_sqft INTEGER,
    
    -- Compliance & Licensing
    dtcm_license VARCHAR(100),
    dtcm_expiry DATE,
    ejari_number VARCHAR(100),
    
    -- Financial Settings
    currency CHAR(3) DEFAULT 'AED',
    vat_registered BOOLEAN DEFAULT TRUE,
    vat_rate DECIMAL(5,2) DEFAULT 5.00, -- UAE VAT is 5%
    timezone VARCHAR(50) DEFAULT 'Asia/Dubai',
    fiscal_year_start INTEGER DEFAULT 1, -- Month (1 = January)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- CHANNELS (Booking Platforms)
-- ----------------------------------------------------------------------------
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'airbnb', 'booking', 'direct', etc.
    name VARCHAR(100) NOT NULL,
    
    -- Fee Structure
    commission_rate DECIMAL(5,2), -- Platform commission %
    payment_processing_rate DECIMAL(5,2), -- Payment processing %
    flat_fee_per_booking DECIMAL(10,2) DEFAULT 0,
    
    -- Integration (future use)
    api_enabled BOOLEAN DEFAULT FALSE,
    ical_url TEXT,
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    color_hex VARCHAR(7) DEFAULT '#6B7280', -- For charts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default channels
INSERT INTO channels (code, name, commission_rate, payment_processing_rate, color_hex) VALUES
    ('airbnb', 'Airbnb', 3.00, 0.00, '#FF5A5F'),
    ('booking', 'Booking.com', 15.00, 0.00, '#003580'),
    ('direct', 'Direct Booking', 0.00, 2.90, '#10B981'),
    ('vrbo', 'VRBO', 5.00, 0.00, '#3B5998'),
    ('other', 'Other', 0.00, 0.00, '#6B7280');

-- ----------------------------------------------------------------------------
-- EXPENSE CATEGORIES (Chart of Accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_code VARCHAR(20), -- For hierarchy
    
    -- Classification
    category_type VARCHAR(50), -- revenue, operating_expense, capital, other
    cost_type cost_type DEFAULT 'variable',
    is_vat_applicable BOOLEAN DEFAULT TRUE,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Chart of Accounts (UAE Holiday Home focused)
INSERT INTO expense_categories (code, name, parent_code, category_type, cost_type, is_vat_applicable, display_order) VALUES
    -- Revenue Categories
    ('4000', 'Revenue', NULL, 'revenue', 'variable', FALSE, 100),
    ('4100', 'Accommodation Revenue', '4000', 'revenue', 'variable', FALSE, 110),
    ('4101', 'Nightly Rate Revenue', '4100', 'revenue', 'variable', FALSE, 111),
    ('4102', 'Cleaning Fees Collected', '4100', 'revenue', 'variable', FALSE, 112),
    ('4103', 'Extra Guest Fees', '4100', 'revenue', 'variable', FALSE, 113),
    ('4104', 'Late Checkout Fees', '4100', 'revenue', 'variable', FALSE, 114),
    ('4105', 'Other Service Fees', '4100', 'revenue', 'variable', FALSE, 115),
    
    -- Pass-through (collected and remitted)
    ('4200', 'Taxes/Fees Collected', '4000', 'revenue', 'variable', FALSE, 120),
    ('4201', 'Tourism Dirham Collected', '4200', 'revenue', 'variable', FALSE, 121),
    ('4202', 'Municipality Fee Collected', '4200', 'revenue', 'variable', FALSE, 122),
    ('4203', 'VAT Collected', '4200', 'revenue', 'variable', FALSE, 123),
    
    -- Operating Expenses
    ('5000', 'Operating Expenses', NULL, 'operating_expense', 'variable', TRUE, 200),
    
    -- Platform & Payment Fees
    ('5100', 'Platform & Payment Fees', '5000', 'operating_expense', 'variable', FALSE, 210),
    ('5101', 'Airbnb Commission', '5100', 'operating_expense', 'variable', FALSE, 211),
    ('5102', 'Booking.com Commission', '5100', 'operating_expense', 'variable', FALSE, 212),
    ('5103', 'Payment Processing Fees', '5100', 'operating_expense', 'variable', FALSE, 213),
    ('5104', 'Channel Manager Fees', '5100', 'operating_expense', 'fixed', TRUE, 214),
    
    -- Utilities
    ('5200', 'Utilities', '5000', 'operating_expense', 'variable', TRUE, 220),
    ('5201', 'DEWA (Electric & Water)', '5200', 'operating_expense', 'variable', TRUE, 221),
    ('5202', 'District Cooling', '5200', 'operating_expense', 'variable', TRUE, 222),
    ('5203', 'Internet/WiFi', '5200', 'operating_expense', 'fixed', TRUE, 223),
    ('5204', 'Gas', '5200', 'operating_expense', 'variable', TRUE, 224),
    
    -- Cleaning & Laundry
    ('5300', 'Cleaning & Laundry', '5000', 'operating_expense', 'variable', TRUE, 230),
    ('5301', 'Turnover Cleaning', '5300', 'operating_expense', 'variable', TRUE, 231),
    ('5302', 'Deep Cleaning', '5300', 'operating_expense', 'variable', TRUE, 232),
    ('5303', 'Laundry Service', '5300', 'operating_expense', 'variable', TRUE, 233),
    ('5304', 'Cleaning Supplies', '5300', 'operating_expense', 'variable', TRUE, 234),
    
    -- Supplies & Amenities
    ('5400', 'Supplies & Amenities', '5000', 'operating_expense', 'variable', TRUE, 240),
    ('5401', 'Toiletries', '5400', 'operating_expense', 'variable', TRUE, 241),
    ('5402', 'Kitchen Supplies', '5400', 'operating_expense', 'variable', TRUE, 242),
    ('5403', 'Linens & Towels', '5400', 'operating_expense', 'variable', TRUE, 243),
    ('5404', 'Guest Amenities', '5400', 'operating_expense', 'variable', TRUE, 244),
    
    -- Maintenance & Repairs
    ('5500', 'Maintenance & Repairs', '5000', 'operating_expense', 'variable', TRUE, 250),
    ('5501', 'AC Service/Repair', '5500', 'operating_expense', 'variable', TRUE, 251),
    ('5502', 'Plumbing', '5500', 'operating_expense', 'variable', TRUE, 252),
    ('5503', 'Electrical', '5500', 'operating_expense', 'variable', TRUE, 253),
    ('5504', 'Appliance Repair', '5500', 'operating_expense', 'variable', TRUE, 254),
    ('5505', 'General Handyman', '5500', 'operating_expense', 'variable', TRUE, 255),
    ('5506', 'Pest Control', '5500', 'operating_expense', 'variable', TRUE, 256),
    
    -- Property Costs
    ('5600', 'Property Costs', '5000', 'operating_expense', 'fixed', TRUE, 260),
    ('5601', 'Service Charges (HOA)', '5600', 'operating_expense', 'fixed', TRUE, 261),
    ('5602', 'Insurance', '5600', 'operating_expense', 'fixed', TRUE, 262),
    ('5603', 'DTCM License/Permit', '5600', 'operating_expense', 'fixed', TRUE, 263),
    ('5604', 'Ejari Fee', '5600', 'operating_expense', 'fixed', TRUE, 264),
    
    -- Management
    ('5700', 'Management', '5000', 'operating_expense', 'variable', TRUE, 270),
    ('5701', 'Property Manager Fee', '5700', 'operating_expense', 'variable', TRUE, 271),
    ('5702', 'Co-host Fee', '5700', 'operating_expense', 'variable', TRUE, 272),
    ('5703', 'Virtual Assistant', '5700', 'operating_expense', 'fixed', TRUE, 273),
    
    -- Marketing
    ('5800', 'Marketing', '5000', 'operating_expense', 'variable', TRUE, 280),
    ('5801', 'Photography', '5800', 'operating_expense', 'one_time', TRUE, 281),
    ('5802', 'Listing Optimization', '5800', 'operating_expense', 'one_time', TRUE, 282),
    ('5803', 'Direct Booking Marketing', '5800', 'operating_expense', 'variable', TRUE, 283),
    
    -- Other Operating
    ('6000', 'Other Expenses', NULL, 'operating_expense', 'variable', TRUE, 300),
    ('6100', 'Bank Charges', '6000', 'operating_expense', 'variable', FALSE, 310),
    ('6200', 'Professional Fees', '6000', 'operating_expense', 'variable', TRUE, 320),
    ('6300', 'Miscellaneous', '6000', 'operating_expense', 'variable', TRUE, 330),
    
    -- Capital Expenditure
    ('7000', 'Capital Expenditure', NULL, 'capital', 'capital', TRUE, 400),
    ('7100', 'Furniture', '7000', 'capital', 'capital', TRUE, 410),
    ('7200', 'Appliances', '7000', 'capital', 'capital', TRUE, 420),
    ('7300', 'Electronics', '7000', 'capital', 'capital', TRUE, 430),
    ('7400', 'Renovations', '7000', 'capital', 'capital', TRUE, 440);

-- ----------------------------------------------------------------------------
-- BOOKINGS (Main Revenue Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    channel_id UUID NOT NULL REFERENCES channels(id),
    
    -- Booking Identification
    booking_ref VARCHAR(100), -- Platform's booking ID
    confirmation_code VARCHAR(50),
    
    -- Guest Info
    guest_name VARCHAR(255),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_count INTEGER DEFAULT 1,
    
    -- Dates
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
    booked_at TIMESTAMPTZ,
    
    -- Status
    status booking_status DEFAULT 'confirmed',
    
    -- Pricing (all in property currency - AED)
    nightly_rate DECIMAL(10,2) NOT NULL, -- Base rate per night
    subtotal_accommodation DECIMAL(10,2), -- nightly_rate × nights
    cleaning_fee DECIMAL(10,2) DEFAULT 0,
    extra_guest_fee DECIMAL(10,2) DEFAULT 0,
    other_fees DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_reason VARCHAR(255),
    
    -- Gross booking value (before platform fees and taxes)
    gross_revenue DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(subtotal_accommodation, 0) + 
        COALESCE(cleaning_fee, 0) + 
        COALESCE(extra_guest_fee, 0) + 
        COALESCE(other_fees, 0) - 
        COALESCE(discount_amount, 0)
    ) STORED,
    
    -- Taxes & Fees Collected (pass-through)
    tourism_fee DECIMAL(10,2) DEFAULT 0, -- Tourism Dirham
    municipality_fee DECIMAL(10,2) DEFAULT 0,
    vat_collected DECIMAL(10,2) DEFAULT 0,
    
    -- Platform Fees (deducted from payout)
    platform_commission DECIMAL(10,2) DEFAULT 0,
    platform_commission_rate DECIMAL(5,2), -- % for reference
    payment_processing_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Net Revenue (what you actually receive)
    net_revenue DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(subtotal_accommodation, 0) + 
        COALESCE(cleaning_fee, 0) + 
        COALESCE(extra_guest_fee, 0) + 
        COALESCE(other_fees, 0) - 
        COALESCE(discount_amount, 0) -
        COALESCE(platform_commission, 0) -
        COALESCE(payment_processing_fee, 0)
    ) STORED,
    
    -- Payout Information
    payout_date DATE,
    payout_amount DECIMAL(10,2),
    payout_reference VARCHAR(100),
    payout_method payment_method,
    is_paid BOOLEAN DEFAULT FALSE,
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    cancellation_fee_retained DECIMAL(10,2) DEFAULT 0,
    
    -- Notes & Flags
    notes TEXT,
    is_locked BOOLEAN DEFAULT FALSE, -- Lock completed bookings
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (check_out > check_in),
    CONSTRAINT positive_nights CHECK (check_out - check_in > 0)
);

-- Indexes for common queries
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_channel ON bookings(channel_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payout_date ON bookings(payout_date);
CREATE INDEX idx_bookings_property_checkin ON bookings(property_id, check_in);

-- ----------------------------------------------------------------------------
-- EXPENSES (Expense Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    
    -- Expense Details
    expense_date DATE NOT NULL,
    vendor VARCHAR(255),
    description TEXT,
    
    -- Amounts
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + COALESCE(vat_amount, 0)) STORED,
    
    -- Classification
    cost_type cost_type DEFAULT 'variable',
    is_booking_linked BOOLEAN DEFAULT FALSE,
    linked_booking_id UUID REFERENCES bookings(id),
    
    -- Payment
    payment_method payment_method,
    payment_date DATE,
    payment_reference VARCHAR(100),
    is_paid BOOLEAN DEFAULT TRUE,
    
    -- Receipt
    receipt_url TEXT,
    receipt_filename VARCHAR(255),
    
    -- Notes
    notes TEXT,
    
    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_property_date ON expenses(property_id, expense_date);

-- ----------------------------------------------------------------------------
-- CALENDAR BLOCKS (Non-Revenue Days)
-- ----------------------------------------------------------------------------
CREATE TABLE calendar_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED,
    
    reason block_reason NOT NULL,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_block_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_calendar_blocks_property ON calendar_blocks(property_id);
CREATE INDEX idx_calendar_blocks_dates ON calendar_blocks(start_date, end_date);

-- ----------------------------------------------------------------------------
-- ATTACHMENTS (Receipts & Documents)
-- ----------------------------------------------------------------------------
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Polymorphic reference
    entity_type VARCHAR(50) NOT NULL, -- 'booking', 'expense', 'property'
    entity_id UUID NOT NULL,
    
    -- File info
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id)
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (Track all changes)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Who and when
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Monthly Summary View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    DATE_TRUNC('month', b.check_in)::DATE AS month,
    
    -- Booking Metrics
    COUNT(DISTINCT b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS total_bookings,
    SUM(b.nights) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS booked_nights,
    
    -- Revenue
    SUM(b.gross_revenue) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS gross_revenue,
    SUM(b.net_revenue) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS net_revenue,
    SUM(b.platform_commission) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS total_platform_fees,
    
    -- Averages
    AVG(b.nightly_rate) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS avg_nightly_rate,
    
    -- Cancellations
    COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancellations,
    SUM(b.refund_amount) FILTER (WHERE b.status = 'cancelled') AS refund_total

FROM properties p
LEFT JOIN bookings b ON b.property_id = p.id
GROUP BY p.id, p.name, DATE_TRUNC('month', b.check_in);

-- ----------------------------------------------------------------------------
-- Channel Performance View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_channel_performance AS
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    c.id AS channel_id,
    c.name AS channel_name,
    c.color_hex,
    DATE_TRUNC('month', b.check_in)::DATE AS month,
    
    COUNT(DISTINCT b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS bookings,
    SUM(b.nights) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS nights,
    SUM(b.gross_revenue) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS gross_revenue,
    SUM(b.net_revenue) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS net_revenue,
    SUM(b.platform_commission) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS platform_fees

FROM properties p
CROSS JOIN channels c
LEFT JOIN bookings b ON b.property_id = p.id AND b.channel_id = c.id
GROUP BY p.id, p.name, c.id, c.name, c.color_hex, DATE_TRUNC('month', b.check_in);

-- ----------------------------------------------------------------------------
-- Expense Summary View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_expense_summary AS
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    ec.id AS category_id,
    ec.code AS category_code,
    ec.name AS category_name,
    ec.parent_code,
    DATE_TRUNC('month', e.expense_date)::DATE AS month,
    
    COUNT(*) AS expense_count,
    SUM(e.amount) AS amount,
    SUM(e.vat_amount) AS vat_amount,
    SUM(e.total_amount) AS total_amount

FROM properties p
CROSS JOIN expense_categories ec
LEFT JOIN expenses e ON e.property_id = p.id AND e.category_id = ec.id
GROUP BY p.id, p.name, ec.id, ec.code, ec.name, ec.parent_code, DATE_TRUNC('month', e.expense_date);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Calculate Occupancy Rate for a period
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_occupancy(
    p_property_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS DECIMAL AS $$
DECLARE
    v_total_nights INTEGER;
    v_booked_nights INTEGER;
    v_blocked_nights INTEGER;
BEGIN
    -- Total nights in period
    v_total_nights := p_end_date - p_start_date;
    
    -- Booked nights
    SELECT COALESCE(SUM(
        LEAST(check_out, p_end_date) - GREATEST(check_in, p_start_date)
    ), 0)
    INTO v_booked_nights
    FROM bookings
    WHERE property_id = p_property_id
      AND status NOT IN ('cancelled', 'no_show')
      AND check_in < p_end_date
      AND check_out > p_start_date;
    
    -- Blocked nights
    SELECT COALESCE(SUM(
        LEAST(end_date, p_end_date) - GREATEST(start_date, p_start_date)
    ), 0)
    INTO v_blocked_nights
    FROM calendar_blocks
    WHERE property_id = p_property_id
      AND start_date < p_end_date
      AND end_date > p_start_date;
    
    -- Available nights = total - blocked
    -- Occupancy = booked / available
    IF (v_total_nights - v_blocked_nights) > 0 THEN
        RETURN ROUND((v_booked_nights::DECIMAL / (v_total_nights - v_blocked_nights)) * 100, 2);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Calculate NOI for a period
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_noi(
    p_property_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    net_revenue DECIMAL,
    operating_expenses DECIMAL,
    noi DECIMAL,
    expense_ratio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH revenue AS (
        SELECT COALESCE(SUM(b.net_revenue), 0) AS total
        FROM bookings b
        WHERE b.property_id = p_property_id
          AND b.status NOT IN ('cancelled', 'no_show')
          AND b.check_in >= p_start_date
          AND b.check_in < p_end_date
    ),
    expenses AS (
        SELECT COALESCE(SUM(e.total_amount), 0) AS total
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.property_id = p_property_id
          AND e.expense_date >= p_start_date
          AND e.expense_date < p_end_date
          AND ec.category_type = 'operating_expense'
    )
    SELECT 
        r.total AS net_revenue,
        x.total AS operating_expenses,
        (r.total - x.total) AS noi,
        CASE WHEN r.total > 0 
             THEN ROUND((x.total / r.total) * 100, 2)
             ELSE 0 
        END AS expense_ratio
    FROM revenue r, expenses x;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all main tables
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_channels_updated_at BEFORE UPDATE ON channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON expense_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- Audit logging trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to main tables
CREATE TRIGGER trg_bookings_audit AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_expenses_audit AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- SAMPLE DATA (for testing - can be removed in production)
-- ============================================================================

-- Create a test user (password: 'test123' - hashed)
-- In production, use proper password hashing
INSERT INTO users (email, password_hash, full_name, role) VALUES
    ('owner@example.com', 'PLACEHOLDER_HASH', 'Property Owner', 'owner');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
