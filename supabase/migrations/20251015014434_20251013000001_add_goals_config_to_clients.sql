-- Add goals_config column to clients table

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS goals_config JSONB DEFAULT '{}';

COMMENT ON COLUMN clients.goals_config IS 'Monthly goal targets and projections configuration. Structure: { "monthly_targets": { "ad_spend": number, "booked_calls": number, "offer_rate": number, "closes": number, "cpa": number, "sales": number }, "updated_at": timestamp, "updated_by": user_id }';

CREATE INDEX IF NOT EXISTS idx_clients_goals_config ON clients USING gin(goals_config);
