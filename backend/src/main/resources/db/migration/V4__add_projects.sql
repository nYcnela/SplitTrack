CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    budget_pln NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_expenses (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    description VARCHAR(200) NOT NULL,
    amount_pln NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_expense_images (
    id BIGSERIAL PRIMARY KEY,
    project_expense_id BIGINT NOT NULL REFERENCES project_expenses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_project_expenses_project_date ON project_expenses(project_id, expense_date DESC, id DESC);
CREATE INDEX idx_project_expense_images_expense_order ON project_expense_images(project_expense_id, sort_order, id);
