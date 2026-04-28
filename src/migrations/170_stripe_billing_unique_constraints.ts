import type { Migration } from '../lib/migrations';

export const migration_170_stripe_billing_unique_constraints: Migration = {
  version: '170_stripe_billing_unique_constraints',
  description: 'Add Stripe billing uniqueness constraints required by atomic webhook upserts',

  up: async (pool: any) => {
    // Idempotent: ON CONFLICT atomicity requires UNIQUE constraint on stripe_subscription_id.
    // Without this, two concurrent checkout.session.completed webhooks can both INSERT
    // the same stripe_subscription_id, creating a double-subscription. Existing duplicate
    // data must fail this migration instead of being silently ignored.
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'subscriptions_stripe_subscription_id_key'
        ) THEN
          ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_stripe_subscription_id_key
            UNIQUE (stripe_subscription_id);
        END IF;
      END $$;
    `);

    // handleInvoicePaid already uses ON CONFLICT (stripe_invoice_id) but the column
    // lacked a UNIQUE constraint, so the ON CONFLICT clause could throw a runtime
    // error ("no unique or exclusion constraint matching ON CONFLICT specification").
    // Partial index: NULLs are excluded so multiple NULL stripe_invoice_ids are allowed
    // (some billing_history rows are checkout-created, not invoice-driven).
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS billing_history_stripe_invoice_id_idx
      ON billing_history(stripe_invoice_id)
      WHERE stripe_invoice_id IS NOT NULL
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS billing_history_stripe_invoice_id_idx`);
    await pool.query(`
      ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_stripe_subscription_id_key
    `);
  },
};

export default migration_170_stripe_billing_unique_constraints;
