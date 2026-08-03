ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ordered_projects AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at DESC, id DESC) - 1 AS position
    FROM projects
)
UPDATE projects
SET sort_order = ordered_projects.position
FROM ordered_projects
WHERE projects.id = ordered_projects.id;

CREATE INDEX idx_projects_sort_order ON projects(sort_order, id);
