CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    payer VARCHAR(16) NOT NULL,
    amount_pln NUMERIC(12,2) NOT NULL,
    settlement_mode VARCHAR(16) NOT NULL,
    custom_owed_pln NUMERIC(12,2),
    original_amount NUMERIC(12,2) NOT NULL,
    original_currency VARCHAR(8) NOT NULL,
    exchange_rate_to_pln NUMERIC(12,6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settlements (
    id BIGSERIAL PRIMARY KEY,
    from_person VARCHAR(16) NOT NULL,
    to_person VARCHAR(16) NOT NULL,
    amount_pln NUMERIC(12,2) NOT NULL,
    is_full BOOLEAN NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_expense_date ON expenses (expense_date);
CREATE INDEX idx_expenses_created_at ON expenses (created_at);
CREATE INDEX idx_expenses_description ON expenses (description);
CREATE INDEX idx_settlements_created_at ON settlements (created_at);
