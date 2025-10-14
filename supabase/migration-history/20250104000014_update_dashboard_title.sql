-- Update dashboard title in brand_settings to use "Undeniable" instead of "Dashboard"
UPDATE brand_settings SET
  ui = jsonb_set(
    COALESCE(ui, '{}'::jsonb),
    '{dashboardTitle}',
    '"Undeniable"'
  )
WHERE ui->>'dashboardTitle' = 'Dashboard' OR ui->>'dashboardTitle' IS NULL;
