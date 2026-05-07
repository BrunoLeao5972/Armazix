ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

UPDATE users
SET email_verified_at = NOW()
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_auth_codes_code_hash_idx
  ON email_auth_codes(code_hash);

CREATE INDEX IF NOT EXISTS email_auth_codes_user_purpose_idx
  ON email_auth_codes(user_id, purpose);

CREATE INDEX IF NOT EXISTS email_auth_codes_email_purpose_idx
  ON email_auth_codes(email, purpose);
