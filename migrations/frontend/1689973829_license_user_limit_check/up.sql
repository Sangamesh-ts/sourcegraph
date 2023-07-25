CREATE TABLE IF NOT EXISTS license_user_limit_check (
    id SERIAL PRIMARY KEY,
    license_id UUID NOT NULL,
    user_count_alert_sent_at TIMESTAMP WITH TIME ZONE,
    user_count_when_email_last_sent INT,
    FOREIGN KEY (license_id)
        REFERENCES product_licenses (id)
);

