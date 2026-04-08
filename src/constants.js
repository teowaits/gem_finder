// ─── Colour tokens ────────────────────────────────────────────────────────────
// Inherited from teowaits/journal-overlap. Hardcoded hex — no CSS custom props.
export const COLORS = {
  bg:           '#0d111c',
  surface1:     '#131826',
  surface2:     '#161b2a',
  border:       '#1e2436',
  border2:      '#2d3449',
  textPrimary:  '#e2e8f0',
  textSecondary:'#718096',
  textMuted:    '#4a5568',
  blue:         '#63b3ed',
  blueLight:    '#90cdf4',
  amber:        '#f6ad55',
  amberLight:   '#fbd38d',
  green:        '#9ae6b4',
  red:          '#fc8181',
};

// ─── Fonts ────────────────────────────────────────────────────────────────────
export const FONTS = {
  mono: "'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace",
  sans: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
};

// ─── OpenAlex source IDs ──────────────────────────────────────────────────────
// Verify at startup via GET /sources/{id} — display_name must match SOURCE_NAMES.
export const SOURCE_IDS = {
  arxiv:    'S4306400194',
  chemrxiv: 'S4393918830',  // verified 2026-04-07 — 58,596 works
};

// Canonical substrings used for loose display_name verification.
// OpenAlex may return e.g. "arXiv (Cornell University)" — contains check is intentional.
export const SOURCE_NAME_MATCH = {
  arxiv:    'arxiv',
  chemrxiv: 'chemrxiv',
};

// ─── DOI prefixes ─────────────────────────────────────────────────────────────
export const DOI_PREFIXES = {
  arxiv:    '10.48550',
  chemrxiv: '10.26434',
};

// ─── Time window options ──────────────────────────────────────────────────────
export const TIME_WINDOWS = [
  { value: '1w',     label: 'Last week' },
  { value: '2w',     label: 'Last 2 weeks' },
  { value: '1m',     label: 'Last month' },
  { value: '3m',     label: 'Last 3 months' },
  { value: 'custom', label: 'Custom range' },
];

// ─── Limits ───────────────────────────────────────────────────────────────────
export const RESULTS_CAP              = 250;
export const PREFLIGHT_WARN_THRESHOLD = 250;
export const DISAMBIGUATION_LIMIT     = 8;
export const IMPORT_TOPIC_LIMIT       = 25;
export const IMPORT_AUTHOR_LIMIT      = 25;
export const API_DELAY_MS             = 60;   // min ms between paginated requests

// ─── ORCID ────────────────────────────────────────────────────────────────────
// Four groups of four digits separated by hyphens; last char may be X
export const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
export const ORCID_BASE_URL = 'https://orcid.org/';

// ─── API ──────────────────────────────────────────────────────────────────────
export const OPENALEX_BASE = 'https://api.openalex.org';

// ─── select= field lists ──────────────────────────────────────────────────────
// Defines the exact ?select= string for every API call type.
// Keep these trimmed — only fields actually consumed by the UI.
export const SELECTS = {
  // Result card fields (works fetch)
  works: [
    'id',
    'display_name',
    'publication_date',
    'primary_location',
    'authorships',
    'primary_topic',
    'topics',               // full topic list for collapsible "All topics" section
    'abstract_inverted_index',
    'cited_by_count',
    'doi',
    'type',
  ].join(','),

  // Author disambiguation list
  authors: [
    'id',
    'display_name',
    'orcid',
    'last_known_institutions',
    'topics',
    'works_count',
    'cited_by_count',
  ].join(','),

  // On-demand author profile (call 1)
  authorCareer: [
    'id',
    'display_name',
    'orcid',
    'cited_by_count',
    'works_count',
    'last_known_institutions',
    'topics',
  ].join(','),

  // On-demand author profile (call 2 — earliest work for "Publishing since")
  authorEarliest: [
    'id',
    'publication_date',
  ].join(','),

  // On-demand author profile (call 3 — recent venue history)
  authorRecentVenues: [
    'id',
    'display_name',
    'publication_year',
    'primary_location',
  ].join(','),

  // Topic autofill dropdown
  // 'level' is NOT a valid select field on /topics — omit it.
  // Level is inferred from structure: topic.subfield present → leaf Topic,
  // topic.field present but no subfield → Subfield.
  topicAutofill: [
    'id',
    'display_name',
    'subfield',
    'field',
    'domain',
  ].join(','),

  // /subfields endpoint has no 'subfield' parent — only field + domain
  subfieldAutofill: [
    'id',
    'display_name',
    'field',
    'domain',
  ].join(','),

  // Preflight count check — only meta.count matters, but select is still required
  preflightCount: 'id',
};
