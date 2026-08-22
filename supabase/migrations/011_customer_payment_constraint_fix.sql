-- Migration 011: Customer Payment Constraint Fix

-- Drop the old constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass
      AND pg_get_constraintdef(oid) LIKE '%payment_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.customers DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Create the new constraint safely
ALTER TABLE public.customers
  ADD CONSTRAINT customers_payment_type_check 
  CHECK (
    payment_type = ANY (
      ARRAY[
        'Cash'::text,
        'Credit'::text,
        'Partial'::text,
        'Card'::text,
        'Bank Transfer'::text,
        'Wallet'::text
      ]
    )
  );

-- Update default
ALTER TABLE public.customers ALTER COLUMN payment_type SET DEFAULT 'Cash';
