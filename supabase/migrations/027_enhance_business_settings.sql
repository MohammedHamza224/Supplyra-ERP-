-- Migration 027: Enhance business_settings schema with enterprise ERP fields

ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100) DEFAULT '310000000000003',
ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS commercial_register VARCHAR(100) DEFAULT '1010887654',
ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT 'https://supplyra-erp.vercel.app',
ADD COLUMN IF NOT EXISTS tagline VARCHAR(255) DEFAULT 'إدارة توزيع الأغذية وسلاسل الإمداد',
ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(20) DEFAULT 'INV-',
ADD COLUMN IF NOT EXISTS purchase_prefix VARCHAR(20) DEFAULT 'PO-',
ADD COLUMN IF NOT EXISTS batch_prefix VARCHAR(20) DEFAULT 'BATCH-',
ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'شكراً لتعاملكم معنا. البضاعة المباعة لا ترد ولا تستبدل بعد 7 أيام وفق الشروط.';
