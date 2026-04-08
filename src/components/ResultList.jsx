import React, { useMemo } from 'react';
import { COLORS, FONTS, PREFLIGHT_WARN_THRESHOLD, RESULTS_CAP } from '../constants.js';
import ProgressBar from './ProgressBar.jsx';
import ResultCard from './ResultCard.jsx';
import { exportResultsCsv, exportSharedSchemaCsv, computeStatusIndicator } from '../utils.js';

const LIKELIHOOD_ORDER = { green: 0, grey: 1, amber: 2 };

// Landing page — example queries resolved live via the API (avoids hardcoded IDs)
const EXAMPLE_QUERIES = [
  { label: 'Machine Learning', query: 'Machine Learning' },
  { label: 'CRISPR',           query: 'CRISPR' },
];

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ResultList({
  results,
  phase,
  logLine,
  preflightCount,
  errorMsg,
  sortKey,
  setSortKey,
  expandedCards,       // Set<work_id> — reserved for future use
  setExpandedCards,
  loadedProfiles,      // Map<author_id, profile>
  setLoadedProfiles,
  selectedForExport,   // Set<work_id>
  setSelectedForExport,
  fetchProgress,       // { fetched, total }
  contextNote,         // optional info/tip string shown above results
  importMatchMap,      // Map<work_id, string> — matched criterion label per work (import mode)
  searchMode,          // 'topic'|'author'|'import' — drives mode-aware messages
  authorAllWorks,      // bool — drives empty-state suggestion in author mode
  onExampleClick,      // (queryText: string) => void — landing page example pill handler
  exampleLoading,      // string|null — which example query is in-flight
}) {
  const fp = fetchProgress ?? { fetched: 0, total: 0 };

  // Sort is applied to a copy — never mutates results
  const sorted = useMemo(() => {
    const copy = [...results];
    if (sortKey === 'citations') {
      copy.sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0));
    } else if (sortKey === 'likelihood') {
      copy.sort((a, b) => {
        const la = LIKELIHOOD_ORDER[computeStatusIndicator(a)] ?? 1;
        const lb = LIKELIHOOD_ORDER[computeStatusIndicator(b)] ?? 1;
        return la - lb;
      });
    } else {
      copy.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    }
    return copy;
  }, [results, sortKey]);

  function toggleSelect(workId) {
    setSelectedForExport(prev => {
      const next = new Set(prev);
      if (next.has(workId)) next.delete(workId);
      else next.add(workId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedForExport.size === sorted.length && sorted.length > 0) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(sorted.map(w => w.id)));
    }
  }

  function handleExport() {
    const sel = sorted.filter(w => selectedForExport.has(w.id));
    if (!sel.length) return;
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`gem-finder-results-${ts}.csv`, exportResultsCsv(sel));
    downloadCsv(`gem-finder-authors-${ts}.csv`, exportSharedSchemaCsv(sel));
  }

  const showPreflightWarn =
    typeof preflightCount === 'number' &&
    preflightCount > PREFLIGHT_WARN_THRESHOLD &&
    (phase === 'running' || phase === 'done');

  const showEmpty   = phase === 'done' && results.length === 0;
  const showIdle    = phase === 'idle' && results.length === 0;
  const showResults = sorted.length > 0;
  const allSelected = sorted.length > 0 && selectedForExport.size === sorted.length;

  // Mode-aware idle and empty messages
  const idleMessage = {
    topic:  'Select topics and click Search\nto discover recent preprints.',
    author: 'Find an author above and click Search\nto see their recent preprints.',
    import: 'Upload a CSV above and click Search\nto find matching preprints.',
  }[searchMode] ?? 'Click Search to begin.';

  const emptyMessage = (() => {
    if (searchMode === 'author') {
      // contextNote already carries the suggestion — just show a neutral line here
      return 'No results found in this time window.';
    }
    if (searchMode === 'import') {
      return 'No results found.\nCheck that your IDs are valid, or extend the time window.';
    }
    // topic (default)
    return 'No results found.\nTry broadening to a parent Subfield, or extending the time window.';
  })();

  const SORT_LABEL = { date: 'newest first', citations: 'most cited first', likelihood: 'by likelihood' };
  const sortLabel  = SORT_LABEL[sortKey] ?? '';

  const s = {
    panel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: COLORS.bg,
    },
    toolbar: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 20px',
      backgroundColor: COLORS.surface1,
      borderBottom: `1px solid ${COLORS.border}`,
      gap: 12,
    },
    sortGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    sortLabel: {
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      marginRight: 2,
    },
    sortBtn: active => ({
      padding: '4px 10px',
      backgroundColor: active ? COLORS.blue : 'transparent',
      border: `1px solid ${active ? COLORS.blue : COLORS.border2}`,
      borderRadius: 5,
      color: active ? COLORS.bg : COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }),
    rightGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    countLabel: {
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    exportBtn: enabled => ({
      padding: '4px 12px',
      backgroundColor: enabled ? `${COLORS.green}18` : 'transparent',
      border: `1px solid ${enabled ? `${COLORS.green}44` : COLORS.border2}`,
      borderRadius: 5,
      color: enabled ? COLORS.green : COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontSize: 11,
      cursor: enabled ? 'pointer' : 'not-allowed',
      opacity: enabled ? 1 : 0.45,
      transition: 'all 0.15s',
    }),
    scroll: {
      flex: 1,
      overflowY: 'auto',
      padding: '18px 20px',
    },
    warnBanner: {
      padding: '9px 12px',
      backgroundColor: `${COLORS.amber}15`,
      border: `1px solid ${COLORS.amber}40`,
      borderRadius: 6,
      fontSize: 12,
      color: COLORS.amberLight,
      fontFamily: FONTS.sans,
      marginBottom: 16,
      lineHeight: 1.5,
    },
    errorBanner: {
      padding: '9px 12px',
      backgroundColor: `${COLORS.red}15`,
      border: `1px solid ${COLORS.red}40`,
      borderRadius: 6,
      fontSize: 12,
      color: COLORS.red,
      fontFamily: FONTS.sans,
      marginBottom: 16,
    },
    emptyState: {
      textAlign: 'center',
      padding: '64px 32px',
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontSize: 13,
      lineHeight: 1.8,
    },
    selectAllRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    selectAllLabel: {
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      cursor: 'pointer',
      userSelect: 'none',
    },
    legend: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '7px 20px',
      borderBottom: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.surface1,
      flexShrink: 0,
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    legendDot: color => ({
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
    }),
    topicScopeNote: {
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      marginBottom: 12,
      lineHeight: 1.5,
    },
    contextNote: {
      padding: '8px 12px',
      backgroundColor: `${COLORS.blue}10`,
      border: `1px solid ${COLORS.blue}30`,
      borderRadius: 6,
      fontSize: 11,
      color: COLORS.blueLight,
      fontFamily: FONTS.sans,
      marginBottom: 12,
      lineHeight: 1.5,
    },
    // Landing / idle state
    landing: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '72px 56px 0',
      gap: 28,
    },
    landingDesc: {
      textAlign: 'center',
      fontSize: 13,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      lineHeight: 1.8,
      maxWidth: 460,
      margin: 0,
    },
    examplesWrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    },
    examplesLabel: {
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontWeight: 600,
    },
    examplePills: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    examplePill: isLoading => ({
      padding: '6px 16px',
      backgroundColor: isLoading ? COLORS.surface2 : `${COLORS.blue}18`,
      border: `1px solid ${isLoading ? COLORS.border2 : `${COLORS.blue}44`}`,
      borderRadius: 20,
      color: isLoading ? COLORS.textMuted : COLORS.blueLight,
      fontFamily: FONTS.sans,
      fontSize: 12,
      cursor: isLoading ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
    }),
    idleHint: {
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      textAlign: 'center',
      lineHeight: 1.7,
    },
  };

  const exportEnabled = selectedForExport.size > 0;

  return (
    <div style={s.panel}>
      {/* Toolbar — only shown once a search has been initiated */}
      {(showResults || phase !== 'idle') && (
        <div style={s.toolbar}>
          <div style={s.sortGroup}>
            <span style={s.sortLabel}>Sort:</span>
            <button style={s.sortBtn(sortKey === 'date')}        onClick={() => setSortKey('date')}>Newest</button>
            <button style={s.sortBtn(sortKey === 'citations')}   onClick={() => setSortKey('citations')}>Most cited</button>
            <button style={s.sortBtn(sortKey === 'likelihood')}  onClick={() => setSortKey('likelihood')}>Publication likelihood</button>
          </div>
          <div style={s.rightGroup}>
            {showResults && (
              <span style={s.countLabel}>
                {sorted.length} result{sorted.length !== 1 ? 's' : ''}
                {' · '}{sortLabel}
                {selectedForExport.size > 0 && ` · ${selectedForExport.size} selected`}
              </span>
            )}
            <button
              style={s.exportBtn(exportEnabled)}
              onClick={handleExport}
              disabled={!exportEnabled}
              title={exportEnabled ? 'Downloads results CSV + authors CSV' : 'Select results to export'}
            >
              Export{exportEnabled ? ` (${selectedForExport.size})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Status indicator legend — always visible once a search has run */}
      {(showResults || phase !== 'idle') && (
        <div style={s.legend}>
          <span style={{ ...s.legendItem, color: COLORS.textMuted, marginRight: 2 }}>Publication status:</span>
          <span style={s.legendItem}>
            <span style={s.legendDot(COLORS.green)} />
            Likely unpublished (preprint DOI, repository source)
          </span>
          <span style={s.legendItem}>
            <span style={s.legendDot(COLORS.amber)} />
            May be published (non-preprint DOI — verify before contacting)
          </span>
          <span style={s.legendItem}>
            <span style={s.legendDot(COLORS.textMuted)} />
            Status unclear (no DOI or older than 6 months — verify before contacting)
          </span>
        </div>
      )}

      <div style={s.scroll}>
        {/* Progress bar */}
        <ProgressBar
          phase={phase}
          logLine={logLine}
          fetched={fp.fetched}
          total={fp.total}
        />

        {/* Error */}
        {phase === 'error' && errorMsg && (
          <div style={s.errorBanner}>{errorMsg}</div>
        )}

        {/* Preflight warning */}
        {showPreflightWarn && (
          <div style={s.warnBanner}>
            Found {preflightCount.toLocaleString()} results — showing the first {RESULTS_CAP}.
            {' '}Consider using a more specific topic or narrowing the time window.
          </div>
        )}

        {/* Context note — shown for empty results AND non-empty results */}
        {contextNote && (
          <div style={s.contextNote}>{contextNote}</div>
        )}

        {/* Empty state — suppressed when contextNote already explains the situation */}
        {showEmpty && !contextNote && (
          <div style={s.emptyState}>
            {emptyMessage.split('\n').map((line, i) => (
              <span key={i}>{line}{i < emptyMessage.split('\n').length - 1 && <br />}</span>
            ))}
          </div>
        )}

        {/* Idle state — landing page */}
        {showIdle && (
          <div style={s.landing}>
            <p style={s.landingDesc}>
              Gem Finder surfaces recent preprints from arXiv and chemRxiv for editorial
              discovery. Search by topic, author, or import a list from companion tools
              to identify authors to invite for submission.
            </p>

            {searchMode === 'topic' && onExampleClick && (
              <div style={s.examplesWrapper}>
                <span style={s.examplesLabel}>Try an example</span>
                <div style={s.examplePills}>
                  {EXAMPLE_QUERIES.map(({ label, query }) => {
                    const isLoading = exampleLoading === query;
                    return (
                      <button
                        key={query}
                        style={s.examplePill(isLoading)}
                        onClick={() => onExampleClick(query)}
                        disabled={!!exampleLoading}
                      >
                        {isLoading ? `${label}…` : label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={s.idleHint}>
              {idleMessage.split('\n').map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <>
            {searchMode === 'topic' && (
              <p style={s.topicScopeNote}>
                Results include works where your selected topic appears anywhere in the work's topic list.
                The topic shown on each card is the work's <em>primary</em> topic, which may differ.
              </p>
            )}
            <div style={s.selectAllRow}>
              <input
                type="checkbox"
                id="select-all"
                checked={allSelected}
                onChange={toggleSelectAll}
                style={{ accentColor: COLORS.blue, cursor: 'pointer', width: 13, height: 13 }}
              />
              <label htmlFor="select-all" style={s.selectAllLabel}>
                Select all {sorted.length}
              </label>
            </div>

            {sorted.map(work => (
              <ResultCard
                key={work.id}
                work={work}
                isSelected={selectedForExport.has(work.id)}
                onToggleSelect={() => toggleSelect(work.id)}
                loadedProfiles={loadedProfiles}
                setLoadedProfiles={setLoadedProfiles}
                matchedCriterion={importMatchMap?.get(work.id) ?? null}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
