-- ============================================================================
-- Migration 003: Early Tenancy Termination — Penalty & Refund Settlement
-- Holiday Home P&L Management System
-- ============================================================================
-- Adds settlement columns to `tenancies` so early-termination can record:
--   * whether a one-month penalty was charged
--   * the penalty amount (annual_rent / 12)
--   * the refund paid back to the tenant (>= 0), OR
--   * the balance the tenant still owes (>= 0)
--
-- The `cheque_status` enum already includes 'cancelled' / 'replaced', so no
-- enum change is needed to void future cheques on termination.
-- ============================================================================

ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS charge_penalty BOOLEAN DEFAULT FALSE;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS balance_due_amount NUMERIC(12, 2) DEFAULT 0;
