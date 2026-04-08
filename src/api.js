/**
 * api.js — all OpenAlex fetch logic.
 * No UI, no state, no computation beyond what is needed to make API calls.
 * All exports are async functions. Callers pass AbortSignal where cancellation is needed.
 */

import {
  OPENALEX_BASE,
  SOURCE_IDS,
  SOURCE_NAME_MATCH,
  SELECTS,
  RESULTS_CAP,
  DISAMBIGUATION_LIMIT,
  API_DELAY_MS,
} from './constants.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Core fetch wrapper. Throws on non-2xx. Passes signal through.
 * @param {string} url
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object>}
 */
async function apiFetch(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAlex ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

/**
 * Builds the filter string for a /works query.
 * All parameters are optional — omit to skip that filter clause.
 *
 * @param {{ sourceIds?: string[], topicIds?: string[], authorIds?: string[], fromDate?: string }} opts
 * @returns {string}  Comma-separated OpenAlex filter string
 */
/**
 * Returns true if an OpenAlex ID belongs to a subfield
 * (URI contains "/subfields/", e.g. "https://openalex.org/subfields/2202").
 */
function isSubfieldId(id) {
  return typeof id === 'string' && id.includes('/subfields/');
}

/**
 * @param {'OR'|'AND'} topicBooleanMode
 *   OR  — works matching ANY selected topic (default; uses | within filter key)
 *   AND — works matching ALL selected topics (each topic is a separate filter condition)
 */
function buildWorksFilter({ sourceIds, topicIds, topicBooleanMode = 'OR', authorIds, fromDate }) {
  const parts = [];

  if (sourceIds?.length) {
    parts.push(`primary_location.source.id:${sourceIds.join('|')}`);
  }

  if (topicIds?.length) {
    if (topicBooleanMode === 'AND') {
      // Each topic becomes its own filter clause — OpenAlex treats commas as AND
      for (const id of topicIds) {
        if (isSubfieldId(id)) parts.push(`primary_topic.subfield.id:${id}`);
        else                  parts.push(`topics.id:${id}`);
      }
    } else {
      // OR: pipe-separate within each filter key
      const leafIds = topicIds.filter(id => !isSubfieldId(id));
      const sfIds   = topicIds.filter(id =>  isSubfieldId(id));
      if (leafIds.length) parts.push(`topics.id:${leafIds.join('|')}`);
      if (sfIds.length)   parts.push(`primary_topic.subfield.id:${sfIds.join('|')}`);
    }
  }

  if (authorIds?.length) {
    parts.push(`authorships.author.id:${authorIds.join('|')}`);
  }
  if (fromDate) {
    parts.push(`from_publication_date:${fromDate}`);
  }
  parts.push('type:article');

  return parts.join(',');
}

// ─── Startup verification ─────────────────────────────────────────────────────

/**
 * Verifies that the hardcoded arXiv and chemRxiv source IDs still resolve to
 * the expected display_name values. Non-blocking — callers show a warning banner.
 *
 * @returns {Promise<string|null>}  Warning string, or null if all IDs are valid.
 */
export async function verifySourceIds() {
  const warnings = [];

  for (const [key, id] of Object.entries(SOURCE_IDS)) {
    try {
      const data = await apiFetch(
        `${OPENALEX_BASE}/sources/${id}?select=id,display_name`
      );
      const nameOk = data.display_name?.toLowerCase().includes(SOURCE_NAME_MATCH[key]);
      if (!nameOk) {
        warnings.push(
          `${key} source ID may have changed (got "${data.display_name}")`
        );
      }
    } catch {
      warnings.push(`Could not verify ${SOURCE_NAMES[key]} source ID (${id})`);
    }
  }

  return warnings.length ? `Source ID warning: ${warnings.join(' · ')}` : null;
}

// ─── Topic autofill ───────────────────────────────────────────────────────────

/**
 * Searches OpenAlex for topics AND subfields in parallel, merges the results.
 *
 * /topics  → leaf-level topics (~4,500). Objects have a `subfield` parent property.
 * /subfields → subfields (~254). Objects have only `field` + `domain` parents.
 *
 * Subfields are shown first (they match broader searches like "Aerospace Engineering").
 * Combined result is capped at 10.
 *
 * @param {string} query
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object[]>}
 */
export async function searchTopics(query, signal) {
  const enc = encodeURIComponent(query);

  const [topicsData, subfieldsData] = await Promise.all([
    apiFetch(
      `${OPENALEX_BASE}/topics?search=${enc}&per_page=7&select=${SELECTS.topicAutofill}`,
      signal
    ),
    apiFetch(
      `${OPENALEX_BASE}/subfields?search=${enc}&per_page=5&select=${SELECTS.subfieldAutofill}`,
      signal
    ).catch(() => ({ results: [] })), // /subfields is best-effort
  ]);

  const topics    = topicsData.results    ?? [];
  const subfields = subfieldsData.results ?? [];

  // Subfields appear first; deduplicate by id in case of overlap
  const seen = new Set();
  const merged = [];
  for (const item of [...subfields, ...topics]) {
    if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
  }
  return merged.slice(0, 10);
}

// ─── Pre-flight count check ───────────────────────────────────────────────────

/**
 * Fetches only meta.count for a given filter — used before every topic/import
 * fetch to warn the user if the result set is too large or empty.
 *
 * NOT used in Author mode (naturally bounded by author ID).
 *
 * @param {{ sourceIds: string[], topicIds?: string[], authorIds?: string[], fromDate: string }} opts
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<number>}
 */
export async function preflightCount({ sourceIds, topicIds, topicBooleanMode, authorIds, fromDate }, signal) {
  const filter = buildWorksFilter({ sourceIds, topicIds, topicBooleanMode, authorIds, fromDate });
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=${encodeURIComponent(filter)}` +
    `&per_page=1` +
    `&select=${SELECTS.preflightCount}`;

  const data = await apiFetch(url, signal);
  return data.meta?.count ?? 0;
}

// ─── Works fetch ──────────────────────────────────────────────────────────────

/**
 * Fetches works with the given filter, paginating until RESULTS_CAP is reached
 * or there are no more results. Slices to RESULTS_CAP before returning —
 * never truncates mid-page.
 *
 * Calls onProgress(fetched, total) after each page.
 *
 * @param {{
 *   sourceIds?: string[],
 *   topicIds?:  string[],
 *   authorIds?: string[],
 *   fromDate:   string,
 *   onProgress?: (fetched: number, total: number) => void,
 *   signal?:    AbortSignal
 * }} opts
 * @returns {Promise<Object[]>}  Work objects
 */
export async function fetchWorks({
  sourceIds,
  topicIds,
  topicBooleanMode,
  authorIds,
  fromDate,
  onProgress,
  signal,
}) {
  const filter = buildWorksFilter({ sourceIds, topicIds, topicBooleanMode, authorIds, fromDate });
  const results = [];
  let page = 1;
  let reportedTotal = null;

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Fetch cancelled', 'AbortError');
    }

    const url =
      `${OPENALEX_BASE}/works` +
      `?filter=${encodeURIComponent(filter)}` +
      `&per_page=200` +
      `&page=${page}` +
      `&select=${SELECTS.works}` +
      `&sort=publication_date:desc`;

    const data = await apiFetch(url, signal);

    if (reportedTotal === null) reportedTotal = data.meta?.count ?? 0;

    const pageWorks = data.results ?? [];
    results.push(...pageWorks);

    if (onProgress) onProgress(results.length, reportedTotal);

    // Stop if: partial page (last page), cap reached, or no results
    const done =
      pageWorks.length < 200 ||
      results.length >= RESULTS_CAP ||
      pageWorks.length === 0;

    if (done) break;

    page++;
    await delay(API_DELAY_MS);
  }

  return results.slice(0, RESULTS_CAP);
}

// ─── Author disambiguation ────────────────────────────────────────────────────

/**
 * Searches for authors by name. Returns up to DISAMBIGUATION_LIMIT candidates
 * for the disambiguation card.
 *
 * @param {string} query
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object[]>}
 */
export async function searchAuthors(query, signal) {
  const url =
    `${OPENALEX_BASE}/authors` +
    `?search=${encodeURIComponent(query)}` +
    `&per_page=${DISAMBIGUATION_LIMIT}` +
    `&select=${SELECTS.authors}`;

  const data = await apiFetch(url, signal);
  return data.results ?? [];
}

/**
 * Resolves a single author by ORCID, bypassing name search.
 * Returns the author object or null if not found.
 *
 * @param {string} orcid  e.g. "0000-0000-0000-0000"
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object|null>}
 */
export async function searchAuthorByOrcid(orcid, signal) {
  const url =
    `${OPENALEX_BASE}/authors` +
    `?filter=orcid:${encodeURIComponent(orcid)}` +
    `&select=${SELECTS.authors}`;

  const data = await apiFetch(url, signal);
  return data.results?.[0] ?? null;
}

// ─── Author profile — on-demand calls ────────────────────────────────────────
// These are triggered per result card, never preloaded for the full list.

/**
 * Fetches career summary for an author (profile call 1).
 *
 * @param {string} authorId  OpenAlex author ID (full URI or short ID)
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object>}  Author object
 */
export async function fetchAuthorCareer(authorId, signal) {
  const id = normaliseId(authorId);
  const url = `${OPENALEX_BASE}/authors/${id}?select=${SELECTS.authorCareer}`;
  return apiFetch(url, signal);
}

/**
 * Fetches the author's earliest work to derive "Publishing since YYYY" (profile call 2).
 *
 * @param {string} authorId
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object|null>}  Earliest work object, or null
 */
export async function fetchAuthorEarliestWork(authorId, signal) {
  const id = normaliseId(authorId);
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=authorships.author.id:${id}` +
    `&sort=publication_date:asc` +
    `&per_page=1` +
    `&select=${SELECTS.authorEarliest}`;

  const data = await apiFetch(url, signal);
  return data.results?.[0] ?? null;
}

/**
 * Fetches the author's 10 most recent works to derive "Usually publishes in: ..."
 * (profile call 3).
 *
 * @param {string} authorId
 * @param {AbortSignal|undefined} signal
 * @returns {Promise<Object[]>}  Up to 10 recent work objects
 */
export async function fetchAuthorRecentVenues(authorId, signal) {
  const id = normaliseId(authorId);
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=authorships.author.id:${id}` +
    `&sort=publication_date:desc` +
    `&per_page=10` +
    `&select=${SELECTS.authorRecentVenues}`;

  const data = await apiFetch(url, signal);
  return data.results ?? [];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Strips the OpenAlex base URI prefix from an ID if present.
 * e.g. "https://openalex.org/A5023888391" → "A5023888391"
 */
function normaliseId(id) {
  return id?.replace('https://openalex.org/', '') ?? id;
}
