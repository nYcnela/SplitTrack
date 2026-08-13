ALTER TABLE expenses
    ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_project_date ON expenses(project_id, expense_date DESC, id DESC);
