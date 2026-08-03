CREATE TABLE shopping_lists (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shopping_list_items (
    id BIGSERIAL PRIMARY KEY,
    shopping_list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    price_pln NUMERIC(12,2),
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shopping_list_item_links (
    id BIGSERIAL PRIMARY KEY,
    shopping_list_item_id BIGINT NOT NULL REFERENCES shopping_list_items(id) ON DELETE CASCADE,
    offer_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_shopping_lists_sort_order ON shopping_lists(sort_order, id);
CREATE INDEX idx_shopping_list_items_list_order ON shopping_list_items(shopping_list_id, sort_order, id);
CREATE INDEX idx_shopping_list_item_links_item_order ON shopping_list_item_links(shopping_list_item_id, sort_order, id);
