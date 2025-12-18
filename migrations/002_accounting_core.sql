-- ============================================================================
-- Migration 002: Double-Entry Accounting Core Schema
-- Holiday Home P&L Management System
-- ============================================================================

-- Chart of Accounts - defines all account types
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id UUID REFERENCES accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for accounts
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);

-- Journal Entries - the header for each accounting transaction
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    reference_number VARCHAR(50) UNIQUE,
    description TEXT NOT NULL,
    property_id UUID REFERENCES properties(id),
    source_type VARCHAR(50), -- 'booking', 'expense', 'cheque', 'manual', etc.
    source_id UUID, -- Reference to the source record
    is_posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMP WITH TIME ZONE,
    posted_by UUID,
    is_reversed BOOLEAN DEFAULT FALSE,
    reversed_by_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_property ON journal_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_posted ON journal_entries(is_posted);

-- Journal Entry Lines - the debit/credit entries
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    line_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure either debit or credit is set, not both
    CONSTRAINT check_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- Create indexes for journal entry lines
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);

-- Account Balances - running balance per account per period (for performance)
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    property_id UUID REFERENCES properties(id),
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    debit_total DECIMAL(15,2) DEFAULT 0,
    credit_total DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(account_id, property_id, period_year, period_month)
);

-- Create indexes for account balances
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_property ON account_balances(property_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON account_balances(period_year, period_month);

-- ============================================================================
-- Insert Default Chart of Accounts
-- ============================================================================

INSERT INTO accounts (code, name, account_type, description) VALUES
-- Asset Accounts (1000s)
('1000', 'Assets', 'asset', 'Parent account for all assets'),
('1100', 'Cash and Bank', 'asset', 'Cash and bank accounts'),
('1110', 'Operating Bank Account', 'asset', 'Main operating bank account'),
('1120', 'Security Deposit Held', 'asset', 'Tenant security deposits held'),
('1200', 'Accounts Receivable', 'asset', 'Money owed by tenants/guests'),
('1210', 'Rent Receivable', 'asset', 'Annual tenancy rent receivable'),
('1220', 'Booking Receivable', 'asset', 'Short-term booking receivable'),
('1300', 'Cheques Receivable', 'asset', 'Post-dated cheques received'),

-- Liability Accounts (2000s)
('2000', 'Liabilities', 'liability', 'Parent account for all liabilities'),
('2100', 'Accounts Payable', 'liability', 'Money owed to vendors'),
('2200', 'Security Deposits Payable', 'liability', 'Tenant security deposits to be returned'),
('2300', 'Deferred Revenue', 'liability', 'Advance payments received'),
('2310', 'Unearned Rent', 'liability', 'Rent received in advance'),
('2320', 'Booking Deposits', 'liability', 'Booking deposits received'),

-- Equity Accounts (3000s)
('3000', 'Equity', 'equity', 'Owner equity'),
('3100', 'Owner Capital', 'equity', 'Owner invested capital'),
('3200', 'Retained Earnings', 'equity', 'Accumulated profits/losses'),

-- Revenue Accounts (4000s)
('4000', 'Revenue', 'revenue', 'Parent account for all revenue'),
('4100', 'Rental Income', 'revenue', 'Income from rentals'),
('4110', 'Annual Tenancy Revenue', 'revenue', 'Revenue from annual tenancies'),
('4120', 'Short-Term Rental Revenue', 'revenue', 'Revenue from short-term bookings'),
('4200', 'Other Income', 'revenue', 'Other miscellaneous income'),
('4210', 'Late Fee Income', 'revenue', 'Late payment fees'),
('4220', 'Cleaning Fee Income', 'revenue', 'Cleaning fees charged'),

-- Expense Accounts (5000s)
('5000', 'Expenses', 'expense', 'Parent account for all expenses'),
('5100', 'Operating Expenses', 'expense', 'Day-to-day operating costs'),
('5110', 'Utilities', 'expense', 'Water, electricity, gas'),
('5120', 'Maintenance & Repairs', 'expense', 'Property maintenance and repairs'),
('5130', 'Cleaning Services', 'expense', 'Cleaning and housekeeping'),
('5140', 'Property Management', 'expense', 'Property management fees'),
('5150', 'Insurance', 'expense', 'Property insurance'),
('5160', 'HOA/Service Charges', 'expense', 'Building service charges'),
('5200', 'Administrative Expenses', 'expense', 'Office and admin costs'),
('5210', 'Bank Charges', 'expense', 'Bank fees and charges'),
('5220', 'Professional Fees', 'expense', 'Legal, accounting fees'),
('5300', 'Marketing Expenses', 'expense', 'Marketing and advertising'),
('5310', 'Platform Commissions', 'expense', 'Airbnb, Booking.com commissions'),
('5400', 'Capital Expenses', 'expense', 'Major improvements and capex')
ON CONFLICT (code) DO NOTHING;

-- Update parent_id references
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1000') WHERE code IN ('1100', '1200', '1300');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1100') WHERE code IN ('1110', '1120');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1200') WHERE code IN ('1210', '1220');

UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '2000') WHERE code IN ('2100', '2200', '2300');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '2300') WHERE code IN ('2310', '2320');

UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '3000') WHERE code IN ('3100', '3200');

UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '4000') WHERE code IN ('4100', '4200');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '4100') WHERE code IN ('4110', '4120');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '4200') WHERE code IN ('4210', '4220');

UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '5000') WHERE code IN ('5100', '5200', '5300', '5400');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '5100') WHERE code IN ('5110', '5120', '5130', '5140', '5150', '5160');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '5200') WHERE code IN ('5210', '5220');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '5300') WHERE code IN ('5310');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to generate next reference number
CREATE OR REPLACE FUNCTION generate_journal_reference()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    ref_prefix VARCHAR(10);
BEGIN
    ref_prefix := 'JE-' || TO_CHAR(NOW(), 'YYMM') || '-';

    SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM LENGTH(ref_prefix) + 1) AS INTEGER)), 0) + 1
    INTO next_num
    FROM journal_entries
    WHERE reference_number LIKE ref_prefix || '%';

    RETURN ref_prefix || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to validate journal entry balance
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debits DECIMAL(15,2);
    total_credits DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO total_debits, total_credits
    FROM journal_entry_lines
    WHERE journal_entry_id = NEW.journal_entry_id;

    -- Allow small rounding differences (0.01)
    IF ABS(total_debits - total_credits) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry is not balanced. Debits: %, Credits: %', total_debits, total_credits;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate balance after each line insert/update
CREATE TRIGGER trg_validate_journal_balance
AFTER INSERT OR UPDATE ON journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION validate_journal_balance();

-- Function to update account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_date DATE;
    v_property_id UUID;
    v_year INTEGER;
    v_month INTEGER;
BEGIN
    -- Get entry date and property from journal entry
    SELECT entry_date, property_id INTO v_entry_date, v_property_id
    FROM journal_entries
    WHERE id = NEW.journal_entry_id;

    v_year := EXTRACT(YEAR FROM v_entry_date);
    v_month := EXTRACT(MONTH FROM v_entry_date);

    -- Upsert account balance
    INSERT INTO account_balances (account_id, property_id, period_year, period_month, debit_total, credit_total)
    VALUES (NEW.account_id, v_property_id, v_year, v_month, NEW.debit_amount, NEW.credit_amount)
    ON CONFLICT (account_id, property_id, period_year, period_month)
    DO UPDATE SET
        debit_total = account_balances.debit_total + EXCLUDED.debit_total,
        credit_total = account_balances.credit_total + EXCLUDED.credit_total,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- Trial Balance View
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(jel.debit_amount), 0) as total_debits,
    COALESCE(SUM(jel.credit_amount), 0) as total_credits,
    COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
FROM accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.is_posted = TRUE
GROUP BY a.id, a.code, a.name, a.account_type
ORDER BY a.code;

-- Income Statement View (P&L)
CREATE OR REPLACE VIEW v_income_statement AS
SELECT
    a.code,
    a.name,
    a.account_type,
    je.property_id,
    EXTRACT(YEAR FROM je.entry_date) as year,
    EXTRACT(MONTH FROM je.entry_date) as month,
    CASE
        WHEN a.account_type = 'revenue' THEN COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
        WHEN a.account_type = 'expense' THEN COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
        ELSE 0
    END as amount
FROM accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.is_posted = TRUE
WHERE a.account_type IN ('revenue', 'expense')
GROUP BY a.id, a.code, a.name, a.account_type, je.property_id,
         EXTRACT(YEAR FROM je.entry_date), EXTRACT(MONTH FROM je.entry_date)
ORDER BY a.account_type DESC, a.code;

-- Balance Sheet View
CREATE OR REPLACE VIEW v_balance_sheet AS
SELECT
    a.code,
    a.name,
    a.account_type,
    CASE
        WHEN a.account_type IN ('asset', 'expense') THEN COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
        ELSE COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
    END as balance
FROM accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.is_posted = TRUE
WHERE a.account_type IN ('asset', 'liability', 'equity')
GROUP BY a.id, a.code, a.name, a.account_type
ORDER BY
    CASE a.account_type
        WHEN 'asset' THEN 1
        WHEN 'liability' THEN 2
        WHEN 'equity' THEN 3
    END,
    a.code;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE accounts IS 'Chart of accounts for double-entry bookkeeping';
COMMENT ON TABLE journal_entries IS 'Header records for accounting transactions';
COMMENT ON TABLE journal_entry_lines IS 'Debit/credit lines for each journal entry';
COMMENT ON TABLE account_balances IS 'Cached period balances for reporting performance';
