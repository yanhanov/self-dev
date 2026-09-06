use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Minimum FTS rank to accept a chunk as relevant for tutor chat.
/// Kept low because short tech-token OR queries produce modest ranks.
pub const TUTOR_RANK_THRESHOLD: f32 = 0.001;
/// Minimum chunks required before generating a grounded lesson.
pub const MIN_LESSON_CHUNKS: usize = 3;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct KnowledgeChunk {
    pub id: Uuid,
    pub title: String,
    pub content_text: String,
    pub source_name: String,
    pub source_url: String,
    pub document_title: String,
    pub rank: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceRef {
    pub chunk_id: Uuid,
    pub source_title: String,
    pub url: String,
    pub excerpt: String,
}

impl KnowledgeChunk {
    pub fn to_source_ref(&self) -> SourceRef {
        let excerpt: String = self.content_text.chars().take(180).collect();
        SourceRef {
            chunk_id: self.id,
            source_title: format!("{} — {}", self.source_name, self.document_title),
            url: self.source_url.clone(),
            excerpt,
        }
    }
}

/// Russian / informal phrases → English KB keywords (content is English).
fn expand_synonyms(raw: &str) -> Vec<String> {
    let lower = raw.to_lowercase();
    let mut extra = Vec::new();

    let pairs: &[(&[&str], &[&str])] = &[
        (&["html", "хтмл", "разметка"], &["html", "semantic", "doctype"]),
        (&["css", "стили", "стиль", "верстка"], &["css", "stylesheet", "layout"]),
        (
            &["flexbox", "флексбокс", "флекс"],
            &["flexbox", "flex", "justify-content"],
        ),
        (&["grid", "грид"], &["grid", "css grid"]),
        (
            &["javascript", "js", "джаваскрипт", "яваскрипт"],
            &["javascript", "dom", "async"],
        ),
        (
            &["react", "реакт"],
            &["react", "jsx", "component", "hooks", "usestate", "useeffect"],
        ),
        (&["usestate", "стейт", "состояние"], &["usestate", "state"]),
        (&["useeffect", "эффект", "эффекты"], &["useeffect", "effect"]),
        (&["hooks", "хуки", "хук"], &["hooks", "usestate", "useeffect"]),
        (&["props", "пропсы", "проп"], &["props", "component"]),
        (&["typescript", "ts", "тайпскрипт"], &["typescript", "types", "interfaces"]),
        (&["git", "гит", "гитхаб", "github"], &["git", "commit", "branch", "merge"]),
        (
            &["доступност", "a11y", "accessibility", "wcag"],
            &["accessibility", "wcag", "aria", "contrast"],
        ),
        (
            &["ux", "исследование", "интервью", "пользовател"],
            &["ux", "research", "usability", "interview"],
        ),
        (
            &["эвристик", "nielsen", "нильсен"],
            &["heuristics", "usability", "nielsen"],
        ),
        (
            &["wireframe", "вайрфрейм", "каркас"],
            &["wireframe", "wireframes", "prototype"],
        ),
        (
            &["figma", "фигма", "auto layout", "автолейаут"],
            &["figma", "auto layout", "components", "frames"],
        ),
        (
            &["прототип", "prototype", "прототипир"],
            &["prototype", "prototyping"],
        ),
        (
            &["типограф", "иерарх", "контраст", "spacing", "отступ"],
            &["typography", "hierarchy", "contrast", "spacing"],
        ),
        (&["компонент", "component"], &["component", "components"]),
        (&["модул", "module", "import"], &["modules", "import", "export"]),
        (&["async", "await", "промис", "promise", "fetch"], &["async", "promise", "fetch"]),
        (&["box model", "бокс", "margin", "padding"], &["box model", "margin", "padding"]),
        (
            &["sql", "эс кью эль", "запрос", "join", "джойн", "select"],
            &["sql", "select", "join", "group by", "where"],
        ),
        (
            &["excel", "эксель", "сводн", "pivot", "xlookup"],
            &["excel", "pivot", "spreadsheet", "xlookup"],
        ),
        (
            &["статистик", "median", "средн", "корреляц", "выброс"],
            &["statistics", "mean", "median", "correlation", "variance"],
        ),
        (
            &["pandas", "dataframe", "питон", "python"],
            &["pandas", "dataframe", "python", "groupby"],
        ),
        (
            &["график", "визуализ", "chart", "dashboard"],
            &["chart", "visualization", "bar", "scatter"],
        ),
        (
            &["выручк", "метрик", "kpi", "бизнес", "рекоменд"],
            &["revenue", "metric", "business", "recommendation"],
        ),
        (&["responsive", "адаптив", "медиа"], &["responsive", "media query"]),
    ];

    for (triggers, keywords) in pairs {
        if triggers.iter().any(|t| lower.contains(t)) {
            for k in *keywords {
                extra.push((*k).to_string());
            }
        }
    }
    extra
}

fn is_cyrillic_token(token: &str) -> bool {
    token.chars().any(|c| ('\u{0400}'..='\u{04FF}').contains(&c))
}

fn is_stopword(token: &str) -> bool {
    matches!(
        token,
        "the"
            | "and"
            | "for"
            | "with"
            | "what"
            | "how"
            | "why"
            | "when"
            | "this"
            | "that"
            | "from"
            | "into"
            | "about"
            | "что"
            | "такое"
            | "как"
            | "это"
            | "для"
            | "или"
            | "при"
            | "про"
            | "есть"
            | "мне"
            | "меня"
            | "пожалуйста"
            | "можно"
            | "нужно"
            | "расскажи"
            | "объясни"
            | "скажи"
            | "чем"
            | "где"
            | "когда"
            | "почему"
            | "какой"
            | "какая"
            | "какие"
            | "which"
            | "does"
            | "mean"
            | "please"
            | "tell"
            | "explain"
    )
}

/// Tokens useful for searching English KB (Latin tech terms + expanded synonyms).
fn search_tokens(text: &str) -> Vec<String> {
    let mut tokens: Vec<String> = text
        .split(|c: char| !c.is_alphanumeric() && c != '-' && c != '_')
        .map(|t| t.to_lowercase())
        .filter(|t| t.chars().count() > 1)
        .filter(|t| !is_stopword(t))
        // Prefer Latin/tech tokens for English FTS; keep longer Cyrillic only if useful
        .filter(|t| !is_cyrillic_token(t) || t.chars().count() >= 5)
        .take(24)
        .collect();

    tokens.extend(expand_synonyms(text));

    // Dedup preserving order
    let mut seen = std::collections::HashSet::new();
    tokens.retain(|t| seen.insert(t.clone()));
    tokens
}

fn normalize_query(text: &str) -> String {
    search_tokens(text).join(" ")
}

/// OR-query safe for to_tsquery('english', ...)
fn build_or_tsquery(tokens: &[String]) -> Option<String> {
    let parts: Vec<String> = tokens
        .iter()
        .filter(|t| !is_cyrillic_token(t))
        .filter(|t| t.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'))
        .map(|t| {
            // Escape single quotes for SQL literal safety (also bound as param)
            let cleaned = t.replace('\'', "");
            format!("{cleaned}:*")
        })
        .filter(|t| t.len() > 2)
        .take(12)
        .collect();

    if parts.is_empty() {
        None
    } else {
        Some(parts.join(" | "))
    }
}

pub async fn retrieve_for_lesson(
    pool: &PgPool,
    profession_id: Uuid,
    lesson_title: &str,
    lesson_summary: &str,
    limit: i64,
) -> anyhow::Result<Vec<KnowledgeChunk>> {
    let raw = format!("{lesson_title} {lesson_summary}");
    let mut chunks = retrieve_for_query(pool, Some(profession_id), &raw, limit).await?;

    if chunks.len() >= MIN_LESSON_CHUNKS {
        return Ok(chunks);
    }

    let fallback = retrieve_fallback(pool, Some(profession_id), limit).await?;
    for chunk in fallback {
        if !chunks.iter().any(|c| c.id == chunk.id) {
            chunks.push(chunk);
        }
        if chunks.len() >= limit as usize {
            break;
        }
    }
    Ok(chunks)
}

pub async fn retrieve_for_query(
    pool: &PgPool,
    profession_id: Option<Uuid>,
    query_text: &str,
    limit: i64,
) -> anyhow::Result<Vec<KnowledgeChunk>> {
    let tokens = search_tokens(query_text);
    if tokens.is_empty() {
        return Ok(vec![]);
    }

    // 1) Prefer OR FTS over Latin/tech tokens (works for RU questions containing "flexbox")
    if let Some(tsq) = build_or_tsquery(&tokens) {
        let chunks = fts_or(pool, profession_id, &tsq, limit).await?;
        if !chunks.is_empty() {
            return Ok(chunks);
        }
    }

    // 2) Fallback: plainto_tsquery on joined Latin tokens only
    let latin_only = tokens
        .iter()
        .filter(|t| !is_cyrillic_token(t))
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");
    if !latin_only.is_empty() {
        let chunks = fts_plain(pool, profession_id, &latin_only, limit).await?;
        if !chunks.is_empty() {
            return Ok(chunks);
        }
    }

    // 3) Last resort: ILIKE against any token / synonym (handles pure Russian via expansions)
    ilike_fallback(pool, profession_id, &tokens, limit).await
}

async fn fts_or(
    pool: &PgPool,
    profession_id: Option<Uuid>,
    tsq: &str,
    limit: i64,
) -> anyhow::Result<Vec<KnowledgeChunk>> {
    if let Some(pid) = profession_id {
        Ok(sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                ts_rank(c.search_vector, to_tsquery('english', $1))::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND (d.profession_id IS NULL OR d.profession_id = $2)
              AND c.search_vector @@ to_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $3
            "#,
        )
        .bind(tsq)
        .bind(pid)
        .bind(limit)
        .fetch_all(pool)
        .await?)
    } else {
        Ok(sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                ts_rank(c.search_vector, to_tsquery('english', $1))::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND c.search_vector @@ to_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $2
            "#,
        )
        .bind(tsq)
        .bind(limit)
        .fetch_all(pool)
        .await?)
    }
}

async fn fts_plain(
    pool: &PgPool,
    profession_id: Option<Uuid>,
    query: &str,
    limit: i64,
) -> anyhow::Result<Vec<KnowledgeChunk>> {
    if let Some(pid) = profession_id {
        Ok(sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                ts_rank(c.search_vector, plainto_tsquery('english', $1))::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND (d.profession_id IS NULL OR d.profession_id = $2)
              AND c.search_vector @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $3
            "#,
        )
        .bind(query)
        .bind(pid)
        .bind(limit)
        .fetch_all(pool)
        .await?)
    } else {
        Ok(sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                ts_rank(c.search_vector, plainto_tsquery('english', $1))::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND c.search_vector @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $2
            "#,
        )
        .bind(query)
        .bind(limit)
        .fetch_all(pool)
        .await?)
    }
}

async fn ilike_fallback(
    pool: &PgPool,
    profession_id: Option<Uuid>,
    tokens: &[String],
    limit: i64,
) -> anyhow::Result<Vec<KnowledgeChunk>> {
    // Use the first few distinctive tokens for ILIKE
    let patterns: Vec<String> = tokens
        .iter()
        .filter(|t| !is_cyrillic_token(t) || expand_synonyms(t).is_empty())
        .take(6)
        .map(|t| format!("%{}%", t))
        .collect();

    if patterns.is_empty() {
        return Ok(vec![]);
    }

    // Match if ANY pattern hits title or content
    if let Some(pid) = profession_id {
        Ok(sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                0.05::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND (d.profession_id IS NULL OR d.profession_id = $1)
              AND EXISTS (
                SELECT 1 FROM unnest($2::text[]) AS p(pat)
                WHERE c.title ILIKE p.pat OR c.content_text ILIKE p.pat
              )
            ORDER BY c.title
            LIMIT $3
            "#,
        )
        .bind(pid)
        .bind(&patterns)
        .bind(limit)
        .fetch_all(pool)
        .await?)
    } else {
        Ok(sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                0.05::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND EXISTS (
                SELECT 1 FROM unnest($1::text[]) AS p(pat)
                WHERE c.title ILIKE p.pat OR c.content_text ILIKE p.pat
              )
            ORDER BY c.title
            LIMIT $2
            "#,
        )
        .bind(&patterns)
        .bind(limit)
        .fetch_all(pool)
        .await?)
    }
}

async fn retrieve_fallback(
    pool: &PgPool,
    profession_id: Option<Uuid>,
    limit: i64,
) -> anyhow::Result<Vec<KnowledgeChunk>> {
    let chunks = if let Some(pid) = profession_id {
        sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                0.0::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
              AND (d.profession_id IS NULL OR d.profession_id = $1)
            ORDER BY d.title, c.chunk_index
            LIMIT $2
            "#,
        )
        .bind(pid)
        .bind(limit)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, KnowledgeChunk>(
            r#"
            SELECT
                c.id,
                c.title,
                c.content_text,
                s.name AS source_name,
                COALESCE(NULLIF(d.url, ''), s.base_url) AS source_url,
                d.title AS document_title,
                0.0::real AS rank
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            JOIN knowledge_sources s ON s.id = d.source_id
            WHERE d.status = 'published'
            ORDER BY d.title, c.chunk_index
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?
    };
    Ok(chunks)
}

pub fn citations_from_chunks(chunks: &[KnowledgeChunk]) -> Vec<SourceRef> {
    chunks.iter().map(|c| c.to_source_ref()).collect()
}

#[allow(dead_code)]
pub fn normalize_query_for_tests(text: &str) -> String {
    normalize_query(text)
}
