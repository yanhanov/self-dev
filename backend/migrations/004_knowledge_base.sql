-- Verified knowledge base for grounded AI generation and tutor chat

CREATE TYPE knowledge_doc_status AS ENUM ('draft', 'published');

CREATE TABLE knowledge_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    base_url    TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id      UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    profession_id  UUID REFERENCES professions(id) ON DELETE SET NULL,
    title          TEXT NOT NULL,
    url            TEXT NOT NULL DEFAULT '',
    language       TEXT NOT NULL DEFAULT 'en',
    status         knowledge_doc_status NOT NULL DEFAULT 'published',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_chunks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id    UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index    INT  NOT NULL DEFAULT 0,
    title          TEXT NOT NULL DEFAULT '',
    content_text   TEXT NOT NULL,
    search_vector  tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, ''))
    ) STORED,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, chunk_index)
);

CREATE TABLE knowledge_chunk_skills (
    chunk_id UUID NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (chunk_id, skill_id)
);

CREATE INDEX idx_knowledge_chunks_fts ON knowledge_chunks USING GIN (search_vector);
CREATE INDEX idx_knowledge_documents_profession ON knowledge_documents (profession_id);
CREATE INDEX idx_knowledge_documents_status ON knowledge_documents (status);

-- Citations on generated lesson content
ALTER TABLE lesson_blocks
    ADD COLUMN IF NOT EXISTS source_refs JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Tutor chat history
CREATE TABLE chat_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id  UUID REFERENCES lessons(id) ON DELETE SET NULL,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    citations  JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_user ON chat_messages (user_id, created_at DESC);

-- Extra skills for UI/UX knowledge tagging
INSERT INTO skills (slug, title, category) VALUES
    ('ux-research',   'UX Research',        'design'),
    ('wireframing',   'Wireframing',        'design'),
    ('ui-principles', 'UI Principles',      'design'),
    ('accessibility', 'Accessibility',     'fundamentals'),
    ('figma',         'Figma',              'tools'),
    ('usability',     'Usability',          'design'),
    ('prototyping',   'Prototyping',        'design')
ON CONFLICT (slug) DO NOTHING;
