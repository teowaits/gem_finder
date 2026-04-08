import React, { useState, useEffect, useRef } from 'react';
import { COLORS, FONTS, SOURCE_IDS, RESULTS_CAP } from './constants.js';
import {
  verifySourceIds,
  preflightCount as apiFetchPreflightCount,
  fetchWorks,
  searchTopics,
} from './api.js';
import { getFromDate, normaliseImportId } from './utils.js';
import SearchPanel from './components/SearchPanel.jsx';
import ResultList from './components/ResultList.jsx';

export default function App() {
  // ─── Search configuration ──────────────────────────────────────────────────
  const [searchMode, setSearchMode]     = useState('topic');   // 'topic'|'author'|'import'
  const [repositories, setRepositories] = useState({ arxiv: true, chemrxiv: true });
  const [timeWindow, setTimeWindow]     = useState('2w');      // '1w'|'2w'|'1m'|'3m'|'custom'
  const [customFrom, setCustomFrom]     = useState(null);      // ISO string | null

  // ─── Topic mode ───────────────────────────────────────────────────────────
  const [selectedTopics, setSelectedTopics]       = useState([]);   // [{ id, display_name, level, parentField }]
  const [topicBooleanMode, setTopicBooleanMode]   = useState('OR'); // 'OR' | 'AND'

  // ─── Author mode (Phase 4) ────────────────────────────────────────────────
  const [authorQuery, setAuthorQuery]         = useState('');
  const [confirmedAuthor, setConfirmedAuthor] = useState(null);
  const [authorAllWorks, setAuthorAllWorks]   = useState(false);

  // ─── Import mode (Phase 5) ───────────────────────────────────────────────
  const [importedItems, setImportedItems] = useState([]);      // [{ type, openalex_id, display_name, notes, orcid }]

  // ─── Fetch state ──────────────────────────────────────────────────────────
  const [phase, setPhase]                   = useState('idle'); // 'idle'|'preflight'|'running'|'done'|'error'
  const [preflightCount, setPreflightCount] = useState(null);
  const [logLine, setLogLine]               = useState('');
  const [errorMsg, setErrorMsg]             = useState('');
  const [results, setResults]               = useState([]);
  const [fetchProgress, setFetchProgress]   = useState({ fetched: 0, total: 0 });

  // ─── Results UI ───────────────────────────────────────────────────────────
  const [expandedCards, setExpandedCards]         = useState(new Set());        // Set<work_id>
  const [loadedProfiles, setLoadedProfiles]       = useState(new Map());        // Map<author_id, ProfileObject>
  const [selectedForExport, setSelectedForExport] = useState(new Set());        // Set<work_id>
  const [sortKey, setSortKey]                     = useState('date');           // 'date'|'citations'|'likelihood'
  const [contextNote, setContextNote]             = useState('');               // optional info tip shown above results
  const [importMatchMap, setImportMatchMap]       = useState(new Map());        // Map<work_id, string> — matched criterion label per work
  const [exampleLoading, setExampleLoading]       = useState(null);             // query string of in-flight example click

  // ─── Startup warning ──────────────────────────────────────────────────────
  const [sourceWarning, setSourceWarning] = useState(null);

  // ─── Abort controller ─────────────────────────────────────────────────────
  const abortRef = useRef(null);

  // ─── Startup — verify source IDs (non-blocking) ───────────────────────────
  useEffect(() => {
    verifySourceIds().then(warning => {
      if (warning) setSourceWarning(warning);
    });
  }, []);

  // ─── Search orchestration ─────────────────────────────────────────────────
  async function handleSearch() {
    // Build source ID list from repository selection
    const sourceIds = Object.entries(repositories)
      .filter(([, enabled]) => enabled)
      .map(([key]) => SOURCE_IDS[key]);

    // Repo selection is only required for modes that filter by source.
    // Author mode fetches from all sources; import-author-only is the same.
    const needsSourceIds =
      searchMode === 'topic' ||
      (searchMode === 'import' &&
        importedItems.some(i => i.type === 'topic' || i.type === 'subfield'));

    if (needsSourceIds && sourceIds.length === 0) {
      setErrorMsg('Select at least one repository.');
      setPhase('error');
      return;
    }

    let fromDate;
    try {
      fromDate = getFromDate(timeWindow, customFrom);
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
      return;
    }

    // Fresh abort controller for this search
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // Reset results state
    setResults([]);
    setSelectedForExport(new Set());
    setExpandedCards(new Set());
    setPreflightCount(null);
    setErrorMsg('');
    setFetchProgress({ fetched: 0, total: 0 });
    setContextNote('');
    setImportMatchMap(new Map());

    try {
      if (searchMode === 'topic') {
        await runTopicSearch({ sourceIds, fromDate, topicBooleanMode, signal });
      } else if (searchMode === 'author') {
        await runAuthorSearch({ fromDate, signal });
      } else if (searchMode === 'import') {
        await runImportSearch({ sourceIds, fromDate, signal });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase('idle');
        setLogLine('');
      } else {
        setPhase('error');
        setErrorMsg(err.message);
      }
    }
  }

  async function runTopicSearch({ sourceIds, fromDate, topicBooleanMode, signal }) {
    const topicIds = selectedTopics.map(t => t.id);

    // ── Preflight ──
    setPhase('preflight');
    setLogLine('Checking result count…');

    const count = await apiFetchPreflightCount(
      { sourceIds, topicIds, topicBooleanMode, fromDate },
      signal
    );
    setPreflightCount(count);

    if (count === 0) {
      setPhase('done');
      setLogLine('');
      setResults([]);
      return;
    }

    // ── Fetch ──
    setPhase('running');
    setLogLine(`Fetching results… 0 of ${Math.min(count, RESULTS_CAP)}`);

    const works = await fetchWorks({
      sourceIds,
      topicIds,
      topicBooleanMode,
      fromDate,
      signal,
      onProgress: (fetched, total) => {
        setFetchProgress({ fetched, total });
        setLogLine(`Fetching results… ${fetched} of ${Math.min(total, RESULTS_CAP)}`);
      },
    });

    setResults(works);
    setPhase('done');
    setLogLine('');
  }

  async function runAuthorSearch({ fromDate, signal }) {
    // No pre-flight — author fetch is naturally bounded
    setPhase('running');
    setLogLine('Fetching author works…');

    const works = await fetchWorks({
      authorIds: [confirmedAuthor.id],
      fromDate,
      signal,
      onProgress: (fetched, total) => {
        setFetchProgress({ fetched, total });
        setLogLine(`Fetching results… ${fetched} of ${Math.min(total, RESULTS_CAP)}`);
      },
    });

    // Repository-only: client-side filter (guards against incomplete metadata)
    const filtered = authorAllWorks
      ? works
      : works.filter(w => w.primary_location?.source?.type === 'repository');

    setResults(filtered);
    setPhase('done');
    setLogLine('');

    // Contextual suggestions based on result count
    if (filtered.length === 0 && !authorAllWorks) {
      setContextNote(
        'No preprints found. Switch to \u2018All works\u2019 to see all this author\u2019s publications, or extend the time window.'
      );
    } else if (authorAllWorks && filtered.length < 5 && ['1w', '2w', '1m'].includes(timeWindow)) {
      setContextNote(
        'Few results found. Try extending to Last 3 months to see more of this author\u2019s recent output.'
      );
    }
  }

  async function runImportSearch({ sourceIds, fromDate, signal }) {
    const importTopics  = importedItems.filter(i => i.type === 'topic' || i.type === 'subfield');
    const importAuthors = importedItems.filter(i => i.type === 'author');

    // workMap accumulates results: work_id → { work, criteria: Set<displayName> }
    const workMap = new Map();

    // Helper: merge a fetched work into workMap with its matched criterion labels
    function addWorks(works, getCriteria) {
      for (const work of works) {
        const criteria = getCriteria(work);
        if (!workMap.has(work.id)) {
          workMap.set(work.id, { work, criteria: new Set(criteria) });
        } else {
          for (const c of criteria) workMap.get(work.id).criteria.add(c);
        }
      }
    }

    // ── Topics fetch ──
    if (importTopics.length > 0) {
      const topicIds = importTopics.map(t => normaliseImportId(t.type, t.openalex_id));

      setPhase('preflight');
      setLogLine('Checking result count…');
      const count = await apiFetchPreflightCount({ sourceIds, topicIds, fromDate }, signal);
      setPreflightCount(count);

      if (count > 0) {
        setPhase('running');
        setLogLine(`Fetching topic results… 0 of ${Math.min(count, RESULTS_CAP)}`);
        const works = await fetchWorks({
          sourceIds,
          topicIds,
          fromDate,
          signal,
          onProgress: (fetched, total) => {
            setFetchProgress({ fetched, total });
            setLogLine(`Fetching topic results… ${fetched} of ${Math.min(total, RESULTS_CAP)}`);
          },
        });

        // Match each work to which imported topics it belongs to
        addWorks(works, work => {
          const workTopicUris = new Set([
            ...(work.topics ?? []).map(t => t.id),
            work.primary_topic?.subfield?.id,
          ].filter(Boolean));
          return importTopics
            .filter(t => workTopicUris.has(normaliseImportId(t.type, t.openalex_id)))
            .map(t => t.display_name);
        });
      }
    }

    // ── Authors fetch ──
    if (importAuthors.length > 0) {
      const authorIds = importAuthors.map(a => normaliseImportId('author', a.openalex_id));

      setPhase('running');
      setLogLine('Fetching author results…');
      const works = await fetchWorks({
        authorIds,
        fromDate,
        signal,
        onProgress: (fetched, total) => {
          setFetchProgress({ fetched, total });
          setLogLine(`Fetching author results… ${fetched} of ${Math.min(total, RESULTS_CAP)}`);
        },
      });

      // Match each work to which imported authors it contains
      addWorks(works, work => {
        const workAuthorUris = new Set(
          (work.authorships ?? []).map(a => a.author?.id).filter(Boolean)
        );
        return importAuthors
          .filter(a => workAuthorUris.has(normaliseImportId('author', a.openalex_id)))
          .map(a => a.display_name);
      });
    }

    // Merge and sort by date desc, cap at RESULTS_CAP
    const merged = [...workMap.values()]
      .sort((a, b) => new Date(b.work.publication_date) - new Date(a.work.publication_date))
      .slice(0, RESULTS_CAP);

    const matchMap = new Map(merged.map(({ work, criteria }) => [work.id, [...criteria].join(', ')]));
    const finalWorks = merged.map(({ work }) => work);

    setResults(finalWorks);
    setImportMatchMap(matchMap);
    setPhase('done');
    setLogLine('');
  }

  // ─── Landing page — example topic click ──────────────────────────────────
  async function handleExampleClick(queryText) {
    if (exampleLoading) return;
    setExampleLoading(queryText);
    try {
      const results = await searchTopics(queryText);
      if (results.length > 0) {
        const t      = results[0];
        const isSf   = t.id?.includes('/subfields/');
        const parent = isSf
          ? (t.field?.display_name ?? '')
          : (t.subfield?.display_name ?? t.field?.display_name ?? '');
        setSelectedTopics([{
          id:           t.id,
          display_name: t.display_name,
          level:        isSf ? 'Subfield' : 'Topic',
          parentField:  parent,
        }]);
        setSearchMode('topic');
      }
    } catch {
      // silent — example clicks don't surface errors
    } finally {
      setExampleLoading(null);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setPhase('idle');
    setLogLine('');
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const s = {
    app: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: COLORS.bg,
      color: COLORS.textPrimary,
      fontFamily: FONTS.mono,
      overflow: 'hidden',
    },
    warningBanner: {
      padding: '7px 24px',
      backgroundColor: `${COLORS.amber}18`,
      borderBottom: `1px solid ${COLORS.amber}55`,
      fontSize: '12px',
      color: COLORS.amberLight,
      fontFamily: FONTS.sans,
    },
    header: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 24px',
      backgroundColor: COLORS.surface1,
      borderBottom: `1px solid ${COLORS.border}`,
    },
    headerLeft: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    },
    headerSuper: {
      fontSize: '10px',
      fontWeight: 400,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
    headerTitle: {
      fontFamily: FONTS.mono,
      fontSize: '15px',
      fontWeight: 600,
      color: COLORS.textPrimary,
      letterSpacing: '0.03em',
    },
    headerMeta: {
      fontSize: '12px',
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    body: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
    },
    footer: {
      flexShrink: 0,
      padding: '8px 24px',
      backgroundColor: COLORS.surface1,
      borderTop: `1px solid ${COLORS.border}`,
      fontSize: '11px',
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      textAlign: 'center',
    },
    footerLink: {
      color: COLORS.blue,
    },
  };

  return (
    <div style={s.app}>
      {sourceWarning && (
        <div style={s.warningBanner}>{sourceWarning}</div>
      )}

      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerSuper}>OpenAlex · Preprint Finder</span>
          <span style={s.headerTitle}>Gem Finder</span>
        </div>
        <span style={s.headerMeta}>arXiv · chemRxiv</span>
      </header>

      <div style={s.body}>
        <SearchPanel
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          repositories={repositories}
          setRepositories={setRepositories}
          timeWindow={timeWindow}
          setTimeWindow={setTimeWindow}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          selectedTopics={selectedTopics}
          setSelectedTopics={setSelectedTopics}
          topicBooleanMode={topicBooleanMode}
          setTopicBooleanMode={setTopicBooleanMode}
          authorQuery={authorQuery}         setAuthorQuery={setAuthorQuery}
          confirmedAuthor={confirmedAuthor}  setConfirmedAuthor={setConfirmedAuthor}
          authorAllWorks={authorAllWorks}    setAuthorAllWorks={setAuthorAllWorks}
          importedItems={importedItems}
          setImportedItems={setImportedItems}
          phase={phase}
          onSearch={handleSearch}
          onCancel={handleCancel}
        />
        <ResultList
          results={results}
          phase={phase}
          logLine={logLine}
          preflightCount={preflightCount}
          errorMsg={errorMsg}
          sortKey={sortKey}
          setSortKey={setSortKey}
          expandedCards={expandedCards}
          setExpandedCards={setExpandedCards}
          loadedProfiles={loadedProfiles}
          setLoadedProfiles={setLoadedProfiles}
          selectedForExport={selectedForExport}
          setSelectedForExport={setSelectedForExport}
          fetchProgress={fetchProgress}
          contextNote={contextNote}
          importMatchMap={importMatchMap}
          searchMode={searchMode}
          authorAllWorks={authorAllWorks}
          onExampleClick={handleExampleClick}
          exampleLoading={exampleLoading}
        />
      </div>

      <footer style={s.footer}>
        Created by{' '}
        <a
          href="https://github.com/teowaits"
          target="_blank"
          rel="noreferrer"
          style={s.footerLink}
        >
          teowaits
        </a>
        {' '}· Data from{' '}
        <a
          href="https://openalex.org"
          target="_blank"
          rel="noreferrer"
          style={s.footerLink}
        >
          OpenAlex API
        </a>
        {' '}(CC0) · MIT License
      </footer>
    </div>
  );
}
