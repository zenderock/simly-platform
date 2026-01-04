-- Migration Script: Assign Existing Data to Default Application
-- 
-- This script assigns all "orphaned" data (where application_id IS NULL) 
-- to the oldest application within the same organization.

-- 1. Migrate Devices
UPDATE devices d
SET application_id = sub.app_id
FROM (
    SELECT DISTINCT ON (organization_id) organization_id, id as app_id
    FROM applications
    ORDER BY organization_id, created_at ASC
) sub
WHERE d.organization_id = sub.organization_id
  AND d.application_id IS NULL;

-- 2. Migrate Campaigns
UPDATE campaigns c
SET application_id = sub.app_id
FROM (
    SELECT DISTINCT ON (organization_id) organization_id, id as app_id
    FROM applications
    ORDER BY organization_id, created_at ASC
) sub
WHERE c.organization_id = sub.organization_id
  AND c.application_id IS NULL;

-- 3. Migrate Contacts
UPDATE contacts c
SET application_id = sub.app_id
FROM (
    SELECT DISTINCT ON (organization_id) organization_id, id as app_id
    FROM applications
    ORDER BY organization_id, created_at ASC
) sub
WHERE c.organization_id = sub.organization_id
  AND c.application_id IS NULL;

-- 4. Migrate Contact Lists
UPDATE contact_lists cl
SET application_id = sub.app_id
FROM (
    SELECT DISTINCT ON (organization_id) organization_id, id as app_id
    FROM applications
    ORDER BY organization_id, created_at ASC
) sub
WHERE cl.organization_id = sub.organization_id
  AND cl.application_id IS NULL;

-- 5. Migrate API Keys (Optional if they have org_id)
UPDATE api_keys k
SET application_id = sub.app_id
FROM (
    SELECT DISTINCT ON (organization_id) organization_id, id as app_id
    FROM applications
    ORDER BY organization_id, created_at ASC
) sub
WHERE k.organization_id = sub.organization_id
  AND k.application_id IS NULL;

-- 6. Migrate Webhooks
UPDATE webhooks w
SET application_id = sub.app_id
FROM (
    SELECT DISTINCT ON (organization_id) organization_id, id as app_id
    FROM applications
    ORDER BY organization_id, created_at ASC
) sub
WHERE w.organization_id = sub.organization_id
  AND w.application_id IS NULL;
