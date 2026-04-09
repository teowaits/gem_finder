import { DOI_PREFIXES } from './constants.js';

// ─── Abstract reconstruction ──────────────────────────────────────────────────

/**
 * Reconstructs a plain-text abstract from OpenAlex's inverted index format.
 * @param {Object|null} abstractInvertedIndex  { word: [position, ...], ... }
 * @returns {string}
 */
export function reconstructAbstract(abstractInvertedIndex) {
  if (!abstractInvertedIndex || typeof abstractInvertedIndex !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(abstractInvertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  // Sparse arrays leave holes — filter to defined entries preserving order
  return words.filter(w => w !== undefined).join(' ');
}

// ─── DOI helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if the DOI belongs to a known preprint server.
 * @param {string|null} doi
 * @returns {boolean}
 */
export function isPreprintDoi(doi) {
  if (!doi) return false;
  const normalised = doi.replace(/^https?:\/\/doi\.org\//i, '');
  return (
    normalised.startsWith(DOI_PREFIXES.arxiv) ||
    normalised.startsWith(DOI_PREFIXES.chemrxiv)
  );
}

// ─── Publication status indicator ────────────────────────────────────────────

/**
 * Computes the visual status indicator for a work.
 * Green:  repository source AND preprint DOI (likely unpublished)
 * Amber:  non-null DOI that is NOT a preprint DOI (may be published)
 * Grey:   null DOI OR publication_date > 6 months ago (verify regardless)
 *
 * Age check runs first — a work >6 months old is always grey even if
 * it otherwise meets the green criteria.
 *
 * @param {Object} work  OpenAlex work object
 * @returns {'green'|'amber'|'grey'}
 */
export function computeStatusIndicator(work) {
  const { primary_location, doi, publication_date } = work;

  // Age check — 6-month threshold overrides everything
  if (publication_date) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    if (new Date(publication_date) < cutoff) return 'grey';
  }

  const sourceType = primary_location?.source?.type;

  // Green: confirmed preprint source + preprint DOI
  if (sourceType === 'repository' && isPreprintDoi(doi)) return 'green';

  // Amber: has a DOI but it's not a preprint prefix → may be published
  if (doi && !isPreprintDoi(doi)) return 'amber';

  // Grey: null DOI (unknown status)
  return 'grey';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the ISO date string (YYYY-MM-DD) for the start of a time window.
 * @param {'1w'|'2w'|'1m'|'3m'|'custom'} timeWindow
 * @param {string|null} customFrom  ISO date string, required when timeWindow='custom'
 * @returns {string}
 */
export function getFromDate(timeWindow, customFrom = null) {
  if (timeWindow === 'custom') {
    if (!customFrom) throw new Error('customFrom required when timeWindow is "custom"');
    return customFrom;
  }
  const dayMap = { '1w': 7, '2w': 14, '1m': 30, '3m': 90 };
  const days = dayMap[timeWindow] ?? 14;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// ─── Import ID normalisation ──────────────────────────────────────────────────

/**
 * Converts a short OpenAlex ID from the shared CSV schema to a full URI,
 * matching the format returned by the API.
 *
 * T10104       → https://openalex.org/T10104        (topic)
 * S2208        → https://openalex.org/subfields/2208 (subfield)
 * A5023888391  → https://openalex.org/A5023888391   (author)
 *
 * Already-full URIs are returned unchanged.
 *
 * @param {'topic'|'subfield'|'author'} type
 * @param {string} shortId
 * @returns {string}
 */
export function normaliseImportId(type, shortId) {
  if (!shortId) return shortId;
  if (shortId.startsWith('https://')) return shortId; // already full URI
  const base = 'https://openalex.org/';
  if (type === 'subfield') {
    // S2208 → https://openalex.org/subfields/2208
    const num = shortId.replace(/^[Ss]/, '');
    return `${base}subfields/${num}`;
  }
  // topic (T...) and author (A...) — just prepend base
  return `${base}${shortId}`;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

/**
 * Escapes a single value for CSV output.
 * Wraps in double-quotes if value contains comma, double-quote, or newline.
 */
function escapeCsv(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Parses a single CSV line, handling quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── CSV import ───────────────────────────────────────────────────────────────

/**
 * Parses a CSV import with flexible column detection.
 *
 * Accepted column names (case-insensitive, spaces/underscores ignored):
 *   type         → type
 *   openalex_id / OpenAlex ID / Open Alex ID → openalex_id
 *   display_name / display name / Name        → display_name
 *   notes / Notes                             → notes
 *   orcid / ORCID                             → orcid
 *
 * Extra columns are ignored. All valid rows are returned — no count limit.
 * The selection cap (25) is enforced in the UI, not here.
 *
 * @param {string} text  Raw CSV text
 * @returns {{ topics: Object[], authors: Object[], all: Object[] }}
 */
export function parseImportCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV is empty or has no data rows.');

  // Normalise a header string: lowercase, strip spaces and underscores
  const norm = h => h.toLowerCase().replace(/[\s_]+/g, '');

  // Map of normalised header → canonical field name
  const HEADER_MAP = {
    type:        'type',
    openalexid:  'openalex_id',   // covers: openalex_id, OpenAlex ID, Open Alex ID
    displayname: 'display_name',  // covers: display_name, display name
    name:        'display_name',
    notes:       'notes',
    orcid:       'orcid',
  };

  const rawHeaders = parseCsvLine(lines[0]);
  const colIndex   = {};   // canonical field → column index
  rawHeaders.forEach((h, i) => {
    const canonical = HEADER_MAP[norm(h)];
    if (canonical && !(canonical in colIndex)) colIndex[canonical] = i;
  });

  if (!('type' in colIndex) || !('openalex_id' in colIndex)) {
    throw new Error(
      'CSV must have a "type" column and an OpenAlex ID column ' +
      '(accepted names: "openalex_id", "OpenAlex ID", "Open Alex ID").'
    );
  }

  const items = lines
    .slice(1)
    .filter(line => line.trim().length > 0)
    .map(line => {
      const cols = parseCsvLine(line);
      return {
        type:         cols[colIndex.type]?.trim().toLowerCase()    ?? '',
        openalex_id:  cols[colIndex.openalex_id]?.trim()           ?? '',
        display_name: colIndex.display_name != null
          ? (cols[colIndex.display_name]?.trim() ?? '') : '',
        notes:        colIndex.notes  != null
          ? (cols[colIndex.notes]?.trim()  ?? '') : '',
        orcid:        colIndex.orcid  != null
          ? (cols[colIndex.orcid]?.trim()  || null) : null,
      };
    })
    .filter(item => item.type && item.openalex_id);

  if (items.length === 0) throw new Error('No valid rows found in this CSV.');

  const topics  = items.filter(i => i.type === 'topic' || i.type === 'subfield');
  const authors = items.filter(i => i.type === 'author');

  return { topics, authors, all: items };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

/**
 * Exports selected works as a detailed results CSV.
 * Columns: openalex_id, title, authors, first_author_institution, repository,
 *          submission_date, primary_topic, subfield, field, citation_count,
 *          status_indicator, doi, landing_page_url, notes
 *
 * @param {Object[]} works  OpenAlex work objects
 * @returns {string}  CSV text
 */
export function exportResultsCsv(works) {
  const headers = [
    'openalex_id', 'title', 'authors', 'first_author_institution',
    'repository', 'submission_date', 'primary_topic', 'subfield',
    'field', 'citation_count', 'status_indicator', 'doi',
    'landing_page_url', 'notes',
  ];

  const rows = works.map(work => {
    const authorNames = (work.authorships ?? [])
      .map(a => a.author?.display_name)
      .filter(Boolean)
      .join('; ');
    const firstInst = work.authorships?.[0]?.institutions?.[0]?.display_name ?? '';

    return [
      work.id ?? '',
      work.display_name ?? '',
      authorNames,
      firstInst,
      work.primary_location?.source?.display_name ?? '',
      work.publication_date ?? '',
      work.primary_topic?.display_name ?? '',
      work.primary_topic?.subfield?.display_name ?? '',
      work.primary_topic?.field?.display_name ?? '',
      work.cited_by_count ?? '',
      computeStatusIndicator(work),
      work.doi ?? '',
      work.primary_location?.landing_page_url ?? '',
      '',
    ].map(escapeCsv);
  });

  return [headers.map(escapeCsv), ...rows].map(r => r.join(',')).join('\n');
}

/**
 * Exports selected works in the shared cross-tool schema.
 * Columns: type, openalex_id, display_name, notes, orcid
 *
 * Exports first authors only — these are the people editors may want to invite.
 *
 * @param {Object[]} works  OpenAlex work objects
 * @returns {string}  CSV text
 */
export function exportSharedSchemaCsv(works) {
  const headers = ['type', 'openalex_id', 'display_name', 'notes', 'orcid'];

  // Deduplicate by author ID — one work may appear multiple times for the same author
  const seen = new Set();
  const rows = [];

  for (const work of works) {
    const firstAuthor = work.authorships?.[0];
    const authorId = firstAuthor?.author?.id;
    if (!authorId || seen.has(authorId)) continue;
    seen.add(authorId);

    rows.push([
      'author',
      authorId,
      firstAuthor.author?.display_name ?? '',
      'gem-finder export',
      firstAuthor.author?.orcid ?? '',
    ].map(escapeCsv));
  }

  return [headers.map(escapeCsv), ...rows].map(r => r.join(',')).join('\n');
}
