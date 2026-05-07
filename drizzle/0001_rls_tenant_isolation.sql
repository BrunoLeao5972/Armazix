CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY stores_tenant_owner_select ON stores
  FOR SELECT USING (owner_user_id = app.current_user_id());

CREATE POLICY stores_tenant_owner_update ON stores
  FOR UPDATE USING (owner_user_id = app.current_user_id());

CREATE POLICY stores_tenant_owner_insert ON stores
  FOR INSERT WITH CHECK (owner_user_id = app.current_user_id());

CREATE POLICY orders_tenant_owner_select ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = orders.store_id
      AND s.owner_user_id = app.current_user_id()
    )
  );

CREATE POLICY orders_tenant_owner_update ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = orders.store_id
      AND s.owner_user_id = app.current_user_id()
    )
  );

CREATE POLICY orders_tenant_owner_insert ON orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = orders.store_id
      AND s.owner_user_id = app.current_user_id()
    )
  );
