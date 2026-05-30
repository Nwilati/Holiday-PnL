-- ============================================================================
-- Migration 004: Connect Annual Tenancy Rent into the Accounting Ledger
-- Holiday Home P&L Management System
-- ============================================================================
-- Seeds the income account used to classify early-termination penalties.
-- Annual tenancy rent itself posts to the existing 4201 (Rent Revenue);
-- normal cleared payments and termination settlements are journaled by the
-- app (see app/api/accounting.py: generate_tenancy_payment_journal /
-- generate_tenancy_termination_journal and the /accounting/backfill-tenancy-journals
-- endpoint). This file is the reference copy of the additive account seed that
-- main.py's run_migrations() applies on startup.
-- ============================================================================

INSERT INTO accounts (id, code, name, account_type, parent_code, is_active)
VALUES (gen_random_uuid(), '4303', 'Early Termination Penalty', 'income', '4300', TRUE)
ON CONFLICT (code) DO NOTHING;
