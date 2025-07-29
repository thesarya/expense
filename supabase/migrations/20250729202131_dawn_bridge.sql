-- Comprehensive Inventory Management System Database Schema
-- Version: 1.0
-- Date: 2024-01-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Distribution Centers
CREATE TABLE distribution_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    manager_id UUID,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms INTEGER DEFAULT 30,
    tax_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item Categories (Hierarchical)
CREATE TABLE item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES item_categories(id),
    level INTEGER DEFAULT 0,
    path TEXT, -- Materialized path for efficient queries
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage Locations
CREATE TABLE storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    zone VARCHAR(50) NOT NULL,
    aisle VARCHAR(50),
    shelf VARCHAR(50),
    bin VARCHAR(50),
    location_code VARCHAR(100) UNIQUE NOT NULL,
    capacity_cubic_meters DECIMAL(10,2),
    temperature_controlled BOOLEAN DEFAULT false,
    hazmat_approved BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items Master
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES item_categories(id),
    unit_of_measure VARCHAR(50) NOT NULL,
    unit_cost DECIMAL(10,2),
    weight_kg DECIMAL(8,3),
    dimensions_cm VARCHAR(50), -- "L x W x H"
    barcode VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id),
    reorder_point INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    lead_time_days INTEGER DEFAULT 0,
    shelf_life_days INTEGER,
    hazmat_class VARCHAR(10),
    is_serialized BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Stock
CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id),
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    storage_location_id UUID REFERENCES storage_locations(id),
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_damaged INTEGER NOT NULL DEFAULT 0,
    quantity_in_repair INTEGER NOT NULL DEFAULT 0,
    quantity_on_order INTEGER NOT NULL DEFAULT 0,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    last_movement_at TIMESTAMP WITH TIME ZONE,
    cost_per_unit DECIMAL(10,2),
    total_value DECIMAL(12,2) GENERATED ALWAYS AS (quantity_available * cost_per_unit) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, distribution_center_id, storage_location_id)
);

-- Stock Movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id),
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    storage_location_id UUID REFERENCES storage_locations(id),
    movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE', 'REPAIR', 'RETURN'
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    reference_type VARCHAR(50), -- 'PURCHASE_ORDER', 'DAMAGE_REPORT', 'REPAIR_ORDER', 'MANUAL_ADJUSTMENT'
    reference_id UUID,
    batch_number VARCHAR(100),
    serial_numbers TEXT[],
    expiry_date DATE,
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Damage Reports
CREATE TABLE damage_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number VARCHAR(100) UNIQUE NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    storage_location_id UUID REFERENCES storage_locations(id),
    quantity_damaged INTEGER NOT NULL,
    damage_type VARCHAR(100) NOT NULL, -- 'PHYSICAL', 'WATER', 'FIRE', 'THEFT', 'EXPIRED', 'CONTAMINATION'
    damage_severity VARCHAR(50) NOT NULL, -- 'MINOR', 'MAJOR', 'TOTAL_LOSS'
    root_cause VARCHAR(200),
    description TEXT NOT NULL,
    estimated_loss_value DECIMAL(10,2),
    actual_loss_value DECIMAL(10,2),
    photos TEXT[], -- Array of photo URLs
    documents TEXT[], -- Array of document URLs
    insurance_claim_number VARCHAR(100),
    reported_by UUID NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'REPORTED', -- 'REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    closure_notes TEXT,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Repair Vendors (extends suppliers for repair-specific info)
CREATE TABLE repair_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    specialization TEXT[],
    certification_level VARCHAR(50),
    average_turnaround_days INTEGER,
    quality_rating DECIMAL(3,2), -- 0.00 to 5.00
    cost_rating VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH'
    preferred_vendor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair Orders
CREATE TABLE repair_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_order_number VARCHAR(100) UNIQUE NOT NULL,
    damage_report_id UUID NOT NULL REFERENCES damage_reports(id),
    repair_vendor_id UUID REFERENCES repair_vendors(id),
    quantity_to_repair INTEGER NOT NULL,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    estimated_completion_date DATE,
    actual_completion_date DATE,
    repair_description TEXT,
    repair_instructions TEXT,
    quality_check_passed BOOLEAN,
    warranty_period_days INTEGER DEFAULT 90,
    warranty_expiry_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNREPAIRABLE'
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    created_by UUID NOT NULL,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair Order Status History
CREATE TABLE repair_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repair_order_id UUID NOT NULL REFERENCES repair_orders(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    subtotal DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    shipping_cost DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    notes TEXT,
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    quantity_rejected INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(100) UNIQUE NOT NULL,
    expense_type VARCHAR(50) NOT NULL, -- 'INVENTORY_PURCHASE', 'REPAIR_COST', 'DAMAGE_WRITEOFF', 'STORAGE_COST', 'HANDLING_FEE'
    reference_type VARCHAR(50), -- 'PURCHASE_ORDER', 'REPAIR_ORDER', 'DAMAGE_REPORT'
    reference_id UUID,
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    supplier_id UUID REFERENCES suppliers(id),
    amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    expense_date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    category VARCHAR(100),
    cost_center VARCHAR(100),
    gl_account VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PAID', 'OVERDUE', 'CANCELLED'
    payment_method VARCHAR(50), -- 'CHECK', 'WIRE', 'ACH', 'CREDIT_CARD'
    payment_date DATE,
    payment_reference VARCHAR(100),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    receipt_url TEXT,
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert Configurations
CREATE TABLE alert_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    distribution_center_id UUID REFERENCES distribution_centers(id),
    alert_type VARCHAR(50) NOT NULL, -- 'LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGE_REPORT', 'REPAIR_OVERDUE', 'EXPENSE_APPROVAL'
    is_global BOOLEAN DEFAULT false,
    threshold_percentage DECIMAL(5,2), -- For stock alerts
    threshold_value INTEGER, -- For absolute thresholds
    threshold_days INTEGER, -- For time-based alerts
    notification_channels TEXT[] NOT NULL, -- ['EMAIL', 'SMS', 'DASHBOARD', 'WEBHOOK']
    email_recipients TEXT[],
    sms_recipients TEXT[],
    webhook_url TEXT,
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_hours INTEGER DEFAULT 24,
    escalation_recipients TEXT[],
    business_hours_only BOOLEAN DEFAULT false,
    frequency_minutes INTEGER DEFAULT 60, -- How often to check
    max_alerts_per_day INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert History
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_configuration_id UUID NOT NULL REFERENCES alert_configurations(id),
    alert_type VARCHAR(50) NOT NULL,
    item_id UUID REFERENCES items(id),
    distribution_center_id UUID NOT NULL REFERENCES distribution_centers(id),
    reference_type VARCHAR(50),
    reference_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    channels_sent TEXT[],
    email_recipients TEXT[],
    sms_recipients TEXT[],
    delivery_status JSONB, -- Track delivery status per channel
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'WAREHOUSE_STAFF', 'WAREHOUSE_MANAGER', 'FINANCE_STAFF', 'SYSTEM_ADMIN'
    distribution_center_id UUID REFERENCES distribution_centers(id),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    employee_id VARCHAR(50),
    department VARCHAR(100),
    manager_id UUID REFERENCES users(id),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration
CREATE TABLE system_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    category VARCHAR(50),
    is_sensitive BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_inventory_stock_item_center ON inventory_stock(item_id, distribution_center_id);
CREATE INDEX idx_inventory_stock_low_stock ON inventory_stock(item_id) WHERE quantity_available <= (SELECT reorder_point FROM items WHERE items.id = inventory_stock.item_id);
CREATE INDEX idx_stock_movements_item_date ON stock_movements(item_id, created_at DESC);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_damage_reports_status ON damage_reports(status, reported_at DESC);
CREATE INDEX idx_damage_reports_center ON damage_reports(distribution_center_id, reported_at DESC);
CREATE INDEX idx_repair_orders_status ON repair_orders(status, created_at DESC);
CREATE INDEX idx_repair_orders_vendor ON repair_orders(repair_vendor_id, status);
CREATE INDEX idx_alert_history_unresolved ON alert_history(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_alert_history_item_center ON alert_history(item_id, distribution_center_id, created_at DESC);
CREATE INDEX idx_expenses_date_center ON expenses(expense_date DESC, distribution_center_id);
CREATE INDEX idx_expenses_reference ON expenses(reference_type, reference_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status, order_date DESC);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id, order_date DESC);
CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX idx_users_role_center ON users(role, distribution_center_id) WHERE is_active = true;
CREATE INDEX idx_audit_log_user_date ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id, created_at DESC);

-- Full-text search indexes
CREATE INDEX idx_items_search ON items USING gin(to_tsvector('english', name || ' ' || description || ' ' || sku));
CREATE INDEX idx_suppliers_search ON suppliers USING gin(to_tsvector('english', name || ' ' || code));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_distribution_centers_updated_at BEFORE UPDATE ON distribution_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_item_categories_updated_at BEFORE UPDATE ON item_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_stock_updated_at BEFORE UPDATE ON inventory_stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repair_vendors_updated_at BEFORE UPDATE ON repair_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repair_orders_updated_at BEFORE UPDATE ON repair_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_configurations_updated_at BEFORE UPDATE ON alert_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values)
        VALUES (TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values)
        VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, table_name, record_id, new_values)
        VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_items AFTER INSERT OR UPDATE OR DELETE ON items FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_inventory_stock AFTER INSERT OR UPDATE OR DELETE ON inventory_stock FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_stock_movements AFTER INSERT OR UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_damage_reports AFTER INSERT OR UPDATE OR DELETE ON damage_reports FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_repair_orders AFTER INSERT OR UPDATE OR DELETE ON repair_orders FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Views for common queries
CREATE VIEW v_current_stock AS
SELECT 
    i.id as item_id,
    i.sku,
    i.name as item_name,
    ic.name as category_name,
    dc.name as distribution_center_name,
    sl.location_code,
    ist.quantity_available,
    ist.quantity_reserved,
    ist.quantity_damaged,
    ist.quantity_in_repair,
    ist.quantity_on_order,
    i.reorder_point,
    i.max_stock_level,
    i.min_stock_level,
    CASE 
        WHEN ist.quantity_available = 0 THEN 'OUT_OF_STOCK'
        WHEN ist.quantity_available <= i.reorder_point THEN 'LOW_STOCK'
        WHEN ist.quantity_available >= i.max_stock_level THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as stock_status,
    ist.cost_per_unit,
    ist.total_value,
    ist.last_counted_at,
    ist.last_movement_at
FROM inventory_stock ist
JOIN items i ON ist.item_id = i.id
JOIN item_categories ic ON i.category_id = ic.id
JOIN distribution_centers dc ON ist.distribution_center_id = dc.id
LEFT JOIN storage_locations sl ON ist.storage_location_id = sl.id
WHERE i.is_active = true AND dc.is_active = true;

CREATE VIEW v_low_stock_alerts AS
SELECT 
    cs.*,
    ROUND((cs.quantity_available::DECIMAL / NULLIF(cs.max_stock_level, 0)) * 100, 2) as stock_percentage
FROM v_current_stock cs
WHERE cs.stock_status IN ('OUT_OF_STOCK', 'LOW_STOCK')
ORDER BY cs.stock_percentage ASC, cs.item_name;

CREATE VIEW v_repair_summary AS
SELECT 
    ro.id,
    ro.repair_order_number,
    i.sku,
    i.name as item_name,
    dc.name as distribution_center_name,
    s.name as vendor_name,
    ro.quantity_to_repair,
    ro.estimated_cost,
    ro.actual_cost,
    ro.status,
    ro.priority,
    ro.estimated_completion_date,
    ro.actual_completion_date,
    CASE 
        WHEN ro.status = 'COMPLETED' THEN 0
        WHEN ro.estimated_completion_date < CURRENT_DATE THEN CURRENT_DATE - ro.estimated_completion_date
        ELSE 0
    END as days_overdue,
    ro.created_at,
    ro.updated_at
FROM repair_orders ro
JOIN damage_reports dr ON ro.damage_report_id = dr.id
JOIN items i ON dr.item_id = i.id
JOIN distribution_centers dc ON dr.distribution_center_id = dc.id
LEFT JOIN repair_vendors rv ON ro.repair_vendor_id = rv.id
LEFT JOIN suppliers s ON rv.supplier_id = s.id;

-- Sample data for testing (optional)
INSERT INTO system_configuration (key, value, description, category) VALUES
('low_stock_threshold_percentage', '20', 'Default percentage for low stock alerts', 'alerts'),
('repair_overdue_threshold_days', '7', 'Days after estimated completion to consider repair overdue', 'repairs'),
('max_failed_login_attempts', '5', 'Maximum failed login attempts before account lockout', 'security'),
('session_timeout_hours', '8', 'Hours before user session expires', 'security'),
('backup_retention_days', '90', 'Days to retain database backups', 'system'),
('audit_log_retention_days', '2555', 'Days to retain audit log entries (7 years)', 'compliance');

-- Grant permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inventory_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inventory_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO inventory_app_user;