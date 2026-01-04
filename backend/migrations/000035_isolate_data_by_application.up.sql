ALTER TABLE campaigns ADD COLUMN application_id INTEGER REFERENCES applications(id);
ALTER TABLE contacts ADD COLUMN application_id INTEGER REFERENCES applications(id);
ALTER TABLE contact_lists ADD COLUMN application_id INTEGER REFERENCES applications(id);
-- Index for performance
CREATE INDEX idx_campaigns_application_id ON campaigns(application_id);
CREATE INDEX idx_contacts_application_id ON contacts(application_id);
CREATE INDEX idx_contact_lists_application_id ON contact_lists(application_id);
