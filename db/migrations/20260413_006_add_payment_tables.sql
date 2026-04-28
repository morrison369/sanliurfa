-- Payment and Subscription Tables
-- Created: 2026-04-13

-- SMS logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX idx_sms_logs_sent ON sms_logs(sent_at);

-- Phone verifications
CREATE TABLE IF NOT EXISTS phone_verifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phone_verifications_user ON phone_verifications(user_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  payment_id VARCHAR(100) NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(100),
  metadata JSONB,
  error_message TEXT,
  webhook_received BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'suspended')),
  price NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method VARCHAR(100),
  auto_renew BOOLEAN DEFAULT true,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  renewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_billing ON subscriptions(next_billing_date);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  subscription_id VARCHAR(100) REFERENCES subscriptions(id),
  payment_id VARCHAR(100) REFERENCES payments(payment_id),
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  amount NUMERIC(10, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) DEFAULT 20,
  tax_amount NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  items JSONB NOT NULL,
  company_info JSONB,
  customer_info JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Add subscription fields to users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_id') THEN
    ALTER TABLE users ADD COLUMN subscription_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
    ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
    ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;
END $$;
