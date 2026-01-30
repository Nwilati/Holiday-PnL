-- ============================================================================
-- HOLIDAY HOME P&L MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Version: 2.0.0
-- Updated: January 16, 2026
-- Database: PostgreSQL 15+ (Neon)
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
    'cheque',
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

-- Tenancy status
CREATE TYPE tenancy_status AS ENUM (
    'active',
    'expired',
    'terminated',
    'renewed'
);

-- Cheque status
CREATE TYPE cheque_status AS ENUM (
    'pending',
    'deposited',
    'cleared',
    'bounced',
    'cancelled',
    'replaced'
);

-- UAE Emirates
CREATE TYPE emirate AS ENUM (
    'abu_dhabi',
    'dubai',
    'sharjah',
    'ajman',
    'ras_al_khaimah',
    'fujairah',
    'umm_al_quwain'
);

-- Off-plan property status
CREATE TYPE offplan_status AS ENUM (
    'active',
    'handed_over',
    'cancelled'
);

-- Off-plan payment status
CREATE TYPE offplan_payment_status AS ENUM (
    'pending',
    'paid',
    'overdue'
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
    property_type VARCHAR(100),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    area VARCHAR(100),
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
    vat_rate DECIMAL(5,2) DEFAULT 5.00,
    timezone VARCHAR(50) DEFAULT 'Asia/Dubai',
    fiscal_year_start INTEGER DEFAULT 1,
    
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
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    commission_rate DECIMAL(5,2),
    payment_processing_rate DECIMAL(5,2),
    flat_fee_per_booking DECIMAL(10,2) DEFAULT 0,
    api_enabled BOOLEAN DEFAULT FALSE,
    ical_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    color_hex VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default channels
INSERT INTO channels (code, name, commission_rate, payment_processing_rate, color_hex) VALUES
    ('airbnb', 'Airbnb', 3.00, 0.00, '#FF5A5F'),
    ('booking', 'Booking.com', 15.00, 0.00, '#003580'),
    ('direct', 'Direct Booking', 0.00, 2.90, '#10B981'),
    ('vrbo', 'VRBO', 5.00, 0.00, '#3B5998'),
    ('expedia', 'Expedia', 15.00, 0.00, '#FFD700'),
    ('agoda', 'Agoda', 15.00, 0.00, '#5C2D91'),
    ('other', 'Other', 0.00, 0.00, '#6B7280');

-- ----------------------------------------------------------------------------
-- EXPENSE CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_code VARCHAR(20),
    category_type VARCHAR(50),
    cost_type cost_type DEFAULT 'variable',
    is_vat_applicable BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories (abbreviated)
INSERT INTO expense_categories (code, name, parent_code, category_type, cost_type, is_vat_applicable, display_order) VALUES
    ('5000', 'Operating Expenses', NULL, 'operating_expense', 'variable', TRUE, 200),
    ('5100', 'Platform & Payment Fees', '5000', 'operating_expense', 'variable', FALSE, 210),
    ('5200', 'Utilities', '5000', 'operating_expense', 'variable', TRUE, 220),
    ('5300', 'Cleaning & Laundry', '5000', 'operating_expense', 'variable', TRUE, 230),
    ('5400', 'Maintenance & Repairs', '5000', 'operating_expense', 'variable', TRUE, 240),
    ('5500', 'Property Management', '5000', 'operating_expense', 'fixed', TRUE, 250),
    ('5600', 'Insurance', '5000', 'operating_expense', 'fixed', TRUE, 260),
    ('5700', 'Marketing', '5000', 'operating_expense', 'variable', TRUE, 270),
    ('5800', 'Guest Supplies', '5000', 'operating_expense', 'variable', TRUE, 280),
    ('5900', 'Administrative', '5000', 'operating_expense', 'fixed', TRUE, 290),
    ('6000', 'Taxes & Fees', NULL, 'operating_expense', 'fixed', FALSE, 300);

-- ----------------------------------------------------------------------------
-- BOOKINGS
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id),
    
    -- Guest Info
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_country VARCHAR(100),
    num_guests INTEGER DEFAULT 1,
    
    -- Dates
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
    
    -- Pricing
    nightly_rate DECIMAL(10,2) NOT NULL,
    cleaning_fee DECIMAL(10,2) DEFAULT 0,
    extra_guest_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    
    -- Revenue Calculations
    gross_revenue DECIMAL(10,2),
    platform_commission DECIMAL(10,2) DEFAULT 0,
    payment_processing_fee DECIMAL(10,2) DEFAULT 0,
    net_revenue DECIMAL(10,2),
    
    -- Tourism Taxes
    tourism_dirham DECIMAL(10,2) DEFAULT 0,
    municipality_fee DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status & Payment
    status booking_status DEFAULT 'pending',
    payment_method payment_method,
    payment_received BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    
    -- Booking Reference
    confirmation_code VARCHAR(50),
    platform_booking_id VARCHAR(100),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for bookings
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_check_in ON bookings(check_in);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ----------------------------------------------------------------------------
-- EXPENSES
-- ----------------------------------------------------------------------------
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id),
    
    -- Basic Info
    description VARCHAR(500) NOT NULL,
    vendor VARCHAR(255),
    
    -- Financial
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'AED',
    
    -- Payment
    expense_date DATE NOT NULL,
    payment_method payment_method,
    payment_status VARCHAR(20) DEFAULT 'pending',
    paid_date DATE,
    reference_number VARCHAR(100),
    
    -- Documentation
    receipt_url TEXT,
    invoice_number VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for expenses
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);

-- ----------------------------------------------------------------------------
-- CALENDAR BLOCKS
-- ----------------------------------------------------------------------------
CREATE TABLE calendar_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason block_reason DEFAULT 'other',
    description VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- ATTACHMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TENANCY TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TENANCIES (Long-term Rentals)
-- ----------------------------------------------------------------------------
CREATE TABLE tenancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Tenant Info
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255),
    tenant_phone VARCHAR(50),
    tenant_emirates_id VARCHAR(50),
    
    -- Contract Details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    num_cheques INTEGER DEFAULT 1,
    
    -- Status
    status tenancy_status DEFAULT 'active',
    ejari_number VARCHAR(100),
    contract_url TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- TENANCY PAYMENTS (Cheques)
-- ----------------------------------------------------------------------------
CREATE TABLE tenancy_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
    
    -- Cheque Details
    cheque_number VARCHAR(50),
    bank_name VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    
    -- Status
    status cheque_status DEFAULT 'pending',
    deposited_date DATE,
    cleared_date DATE,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tenancies
CREATE INDEX idx_tenancies_property_id ON tenancies(property_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_tenancy_payments_tenancy_id ON tenancy_payments(tenancy_id);
CREATE INDEX idx_tenancy_payments_due_date ON tenancy_payments(due_date);
CREATE INDEX idx_tenancy_payments_status ON tenancy_payments(status);

-- ============================================================================
-- OFF-PLAN PROPERTY TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- OFF-PLAN PROPERTIES
-- ----------------------------------------------------------------------------
CREATE TABLE offplan_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Developer & Project Info
    developer VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100),
    
    -- Unit Details
    unit_type VARCHAR(100),
    unit_model VARCHAR(50),
    internal_area_sqm DECIMAL(10,2),
    balcony_area_sqm DECIMAL(10,2),
    total_area_sqm DECIMAL(10,2),
    floor_number INTEGER,
    building_number VARCHAR(50),
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms DECIMAL(3,1) DEFAULT 1,
    parking_spots INTEGER DEFAULT 1,
    
    -- Location
    emirate emirate NOT NULL DEFAULT 'abu_dhabi',
    area VARCHAR(100),
    community VARCHAR(100),
    
    -- Pricing (land_dept_fee auto-calculated based on emirate)
    base_price DECIMAL(15,2) NOT NULL,
    land_dept_fee_percent DECIMAL(5,2),  -- 2% Abu Dhabi, 4% Dubai
    land_dept_fee DECIMAL(15,2),
    admin_fees DECIMAL(10,2) DEFAULT 0,
    other_fees DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(15,2),
    
    -- Timeline
    purchase_date DATE,
    expected_handover DATE,
    actual_handover DATE,
    
    -- Status & Conversion
    status offplan_status DEFAULT 'active',
    converted_property_id UUID REFERENCES properties(id),
    
    -- Promotions/Waivers
    promotion_name VARCHAR(255),
    amc_waiver_years DECIMAL(3,1),
    dlp_waiver_years DECIMAL(3,1),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- OFF-PLAN PAYMENTS (Payment Schedule/Installments)
-- ----------------------------------------------------------------------------
CREATE TABLE offplan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offplan_property_id UUID NOT NULL REFERENCES offplan_properties(id) ON DELETE CASCADE,
    
    -- Installment Details
    installment_number INTEGER NOT NULL,
    milestone_name VARCHAR(255) NOT NULL,  -- e.g., "Booking", "30% Construction", "Handover"
    percentage DECIMAL(5,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE,  -- Can be NULL for TBD (e.g., handover)
    
    -- Payment Status
    status offplan_payment_status DEFAULT 'pending',
    paid_date DATE,
    paid_amount DECIMAL(15,2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    
    -- Receipt/Proof
    receipt_url TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- OFF-PLAN DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE offplan_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offplan_property_id UUID NOT NULL REFERENCES offplan_properties(id) ON DELETE CASCADE,
    
    -- Document Info
    document_type VARCHAR(50) NOT NULL,  -- spa, offer_letter, payment_receipt, oqood, noc, other
    document_name VARCHAR(255) NOT NULL,
    file_data TEXT NOT NULL,  -- Base64 encoded
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Audit
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id)
);

-- Indexes for off-plan
CREATE INDEX idx_offplan_properties_status ON offplan_properties(status);
CREATE INDEX idx_offplan_properties_emirate ON offplan_properties(emirate);
CREATE INDEX idx_offplan_properties_developer ON offplan_properties(developer);
CREATE INDEX idx_offplan_payments_property ON offplan_payments(offplan_property_id);
CREATE INDEX idx_offplan_payments_status ON offplan_payments(status);
CREATE INDEX idx_offplan_payments_due_date ON offplan_payments(due_date);
CREATE INDEX idx_offplan_documents_property ON offplan_documents(offplan_property_id);

-- ============================================================================
-- ACCOUNTING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CHART OF ACCOUNTS
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
    parent_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- JOURNAL ENTRIES
-- ----------------------------------------------------------------------------
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL,
    reference VARCHAR(100),
    description TEXT,
    property_id UUID REFERENCES properties(id),
    is_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- JOURNAL ENTRY LINES
-- ----------------------------------------------------------------------------
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for accounting
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
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
CREATE TRIGGER trg_tenancies_updated_at BEFORE UPDATE ON tenancies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_offplan_properties_updated_at BEFORE UPDATE ON offplan_properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_offplan_payments_updated_at BEFORE UPDATE ON offplan_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-calculate Off-Plan Costs Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_offplan_costs()
RETURNS TRIGGER AS $$
BEGIN
    -- Set land dept fee percent if not provided
    IF NEW.land_dept_fee_percent IS NULL THEN
        IF NEW.emirate = 'dubai' THEN
            NEW.land_dept_fee_percent := 4.00;
        ELSE
            NEW.land_dept_fee_percent := 2.00;  -- Abu Dhabi and others
        END IF;
    END IF;
    
    -- Calculate land dept fee
    NEW.land_dept_fee := ROUND(NEW.base_price * NEW.land_dept_fee_percent / 100, 2);
    
    -- Calculate total cost
    NEW.total_cost := NEW.base_price + COALESCE(NEW.land_dept_fee, 0) + 
                      COALESCE(NEW.admin_fees, 0) + COALESCE(NEW.other_fees, 0);
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_offplan_costs
    BEFORE INSERT OR UPDATE ON offplan_properties
    FOR EACH ROW EXECUTE FUNCTION calculate_offplan_costs();

-- ----------------------------------------------------------------------------
-- Update Overdue Off-Plan Payments Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_offplan_overdue_payments()
RETURNS void AS $$
BEGIN
    UPDATE offplan_payments
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Upcoming Off-Plan Payments View
CREATE OR REPLACE VIEW v_upcoming_offplan_payments AS
SELECT 
    p.id AS payment_id,
    op.id AS property_id,
    op.developer,
    op.project_name,
    op.unit_number,
    op.emirate::text,
    p.installment_number,
    p.milestone_name,
    p.percentage,
    p.amount,
    p.due_date,
    (p.due_date - CURRENT_DATE) AS days_until_due,
    p.status::text
FROM offplan_payments p
JOIN offplan_properties op ON p.offplan_property_id = op.id
WHERE p.status = 'pending'
  AND p.due_date IS NOT NULL
  AND p.due_date >= CURRENT_DATE
ORDER BY p.due_date;

-- Off-Plan Investment Summary View
CREATE OR REPLACE VIEW v_offplan_investment_summary AS
SELECT 
    COUNT(DISTINCT op.id) AS total_properties,
    COALESCE(SUM(op.total_cost), 0) AS total_investment,
    COALESCE(SUM(
        (SELECT COALESCE(SUM(paid_amount), 0) 
         FROM offplan_payments 
         WHERE offplan_property_id = op.id AND status = 'paid')
    ), 0) AS total_paid,
    COALESCE(SUM(op.total_cost), 0) - COALESCE(SUM(
        (SELECT COALESCE(SUM(paid_amount), 0) 
         FROM offplan_payments 
         WHERE offplan_property_id = op.id AND status = 'paid')
    ), 0) AS total_remaining,
    (SELECT COUNT(*) FROM offplan_payments WHERE status = 'pending') AS pending_payments_count,
    (SELECT COUNT(*) FROM offplan_payments WHERE status = 'overdue') AS overdue_payments_count,
    (SELECT COUNT(*) FROM offplan_payments 
     WHERE status = 'pending' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS payments_due_30_days
FROM offplan_properties op
WHERE op.status = 'active';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
