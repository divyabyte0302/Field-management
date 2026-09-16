-- ============================================================
-- V2__work_order_status_history.sql
-- Project KEYSTONE — Document v1.0 Section 11 Status History Table
-- Append-only ledger for all Work Order lifecycle transitions
-- ============================================================

CREATE TABLE IF NOT EXISTS work_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(150),
    changed_by_role VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_wosh_wo_id ON work_order_status_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wosh_timestamp ON work_order_status_history(timestamp);

-- Ensure customer_id column is present and indexed on work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wo_customer ON work_orders(customer_id);
