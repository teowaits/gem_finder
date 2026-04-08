import React from 'react';
import { COLORS, FONTS, TIME_WINDOWS } from '../constants.js';
import TopicSearch from './TopicSearch.jsx';
import AuthorSearch from './AuthorSearch.jsx';
import CsvImport from './CsvImport.jsx';

/**
 * Left panel — mode tabs, mode-specific search UI, repository toggles,
 * time window selector, and Search / Cancel button.
 *
 * Author (Phase 4) and Import (Phase 5) modes render placeholders.
 */
export default function SearchPanel({
  searchMode,       setSearchMode,
  repositories,     setRepositories,
  timeWindow,       setTimeWindow,
  customFrom,       setCustomFrom,
  selectedTopics,   setSelectedTopics,
  topicBooleanMode, setTopicBooleanMode,
  // author props
  authorQuery,      setAuthorQuery,
  confirmedAuthor,  setConfirmedAuthor,
  authorAllWorks,   setAuthorAllWorks,
  // import props
  importedItems,   setImportedItems,
  phase,
  onSearch,
  onCancel,
}) {
  const isSearching = phase === 'preflight' || phase === 'running';
  const disabled    = isSearching;

  const canSearch = (() => {
    const hasRepo = repositories.arxiv || repositories.chemrxiv;
    if (!hasRepo) return false;
    if (searchMode === 'topic')  return selectedTopics.length > 0;
    if (searchMode === 'author') return confirmedAuthor !== null;
    if (searchMode === 'import') return importedItems.length > 0;
    return false;
  })();

  const s = {
    panel: {
      width: 300,
      minWidth: 300,
      display: 'flex',
      flexDirection: 'column',
      borderRight: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.surface1,
      overflow: 'hidden',
    },
    scroll: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 14px 8px',
    },
    footer: {
      padding: '12px 14px',
      borderTop: `1px solid ${COLORS.border}`,
      flexShrink: 0,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 8,
      display: 'block',
    },
    divider: {
      borderTop: `1px solid ${COLORS.border}`,
      margin: '14px 0',
    },
    tabs: {
      display: 'flex',
      gap: 5,
      marginBottom: 16,
    },
    tab: active => ({
      flex: 1,
      padding: '6px 0',
      backgroundColor: active ? `${COLORS.blue}18` : 'transparent',
      border: `1px solid ${active ? `${COLORS.blue}50` : COLORS.border2}`,
      borderRadius: 5,
      color: active ? COLORS.blueLight : COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
    }),
    checkLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 7,
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
    },
    checkLabelText: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
    },
    radioLabel: active => ({
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '3px 0',
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
    }),
    radioText: active => ({
      fontSize: 12,
      color: active ? COLORS.textPrimary : COLORS.textSecondary,
      fontFamily: FONTS.sans,
    }),
    customDateInput: {
      width: '100%',
      padding: '6px 8px',
      marginTop: 8,
      backgroundColor: COLORS.surface2,
      border: `1px solid ${COLORS.border2}`,
      borderRadius: 5,
      color: COLORS.textPrimary,
      fontFamily: FONTS.mono,
      fontSize: 11,
      outline: 'none',
    },
    searchBtn: {
      width: '100%',
      padding: '9px 0',
      backgroundColor: isSearching
        ? COLORS.surface2
        : canSearch
          ? COLORS.blue
          : `${COLORS.blue}30`,
      border: `1px solid ${isSearching ? COLORS.border2 : canSearch ? COLORS.blue : `${COLORS.blue}30`}`,
      borderRadius: 7,
      color: isSearching
        ? COLORS.textSecondary
        : canSearch
          ? COLORS.bg
          : `${COLORS.blue}80`,
      fontFamily: FONTS.sans,
      fontSize: 13,
      fontWeight: 600,
      cursor: isSearching || canSearch ? 'pointer' : 'not-allowed',
      transition: 'all 0.15s',
    },
    placeholder: {
      fontSize: 12,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontStyle: 'italic',
    },
  };

  return (
    <div style={s.panel}>
      <div style={s.scroll}>
        {/* Mode tabs */}
        <div style={s.tabs}>
          {['topic', 'author', 'import'].map(mode => (
            <button
              key={mode}
              style={s.tab(searchMode === mode)}
              onClick={() => { if (!disabled) setSearchMode(mode); }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Mode-specific UI */}
        {searchMode === 'topic' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={s.sectionLabel}>Topics</span>
              {selectedTopics.length > 1 && (
                <div style={{ display: 'flex', gap: 3 }}>
                  {['OR', 'AND'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => !disabled && setTopicBooleanMode(mode)}
                      style={{
                        padding: '2px 7px',
                        fontSize: 10,
                        fontFamily: FONTS.sans,
                        fontWeight: 600,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        borderRadius: 4,
                        border: `1px solid ${topicBooleanMode === mode ? `${COLORS.blue}80` : COLORS.border2}`,
                        backgroundColor: topicBooleanMode === mode ? `${COLORS.blue}25` : 'transparent',
                        color: topicBooleanMode === mode ? COLORS.blueLight : COLORS.textMuted,
                        transition: 'all 0.15s',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <TopicSearch
              selectedTopics={selectedTopics}
              setSelectedTopics={setSelectedTopics}
              disabled={disabled}
            />
          </>
        )}

        {searchMode === 'author' && (
          <AuthorSearch
            authorQuery={authorQuery}
            setAuthorQuery={setAuthorQuery}
            confirmedAuthor={confirmedAuthor}
            setConfirmedAuthor={setConfirmedAuthor}
            authorAllWorks={authorAllWorks}
            setAuthorAllWorks={setAuthorAllWorks}
            disabled={disabled}
          />
        )}

        {searchMode === 'import' && (
          <CsvImport
            importedItems={importedItems}
            setImportedItems={setImportedItems}
            disabled={disabled}
          />
        )}

        <div style={s.divider} />

        {/* Repository checkboxes */}
        <span style={s.sectionLabel}>Repositories</span>
        {[
          { key: 'arxiv',    label: 'arXiv' },
          { key: 'chemrxiv', label: 'chemRxiv' },
        ].map(({ key, label }) => (
          <label key={key} style={s.checkLabel}>
            <input
              type="checkbox"
              checked={repositories[key]}
              onChange={() => {
                if (!disabled) setRepositories(prev => ({ ...prev, [key]: !prev[key] }));
              }}
              disabled={disabled}
              style={{ accentColor: COLORS.blue, cursor: disabled ? 'not-allowed' : 'pointer', width: 13, height: 13 }}
            />
            <span style={s.checkLabelText}>{label}</span>
          </label>
        ))}

        <div style={s.divider} />

        {/* Time window */}
        <span style={s.sectionLabel}>Time window</span>
        {TIME_WINDOWS.map(({ value, label }) => (
          <label key={value} style={s.radioLabel(timeWindow === value)}>
            <input
              type="radio"
              name="timeWindow"
              value={value}
              checked={timeWindow === value}
              onChange={() => { if (!disabled) setTimeWindow(value); }}
              disabled={disabled}
              style={{ accentColor: COLORS.blue, cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
            <span style={s.radioText(timeWindow === value)}>{label}</span>
          </label>
        ))}

        {timeWindow === 'custom' && (
          <input
            type="date"
            value={customFrom ?? ''}
            onChange={e => setCustomFrom(e.target.value || null)}
            disabled={disabled}
            placeholder="From date"
            style={s.customDateInput}
          />
        )}
      </div>

      {/* Search / Cancel */}
      <div style={s.footer}>
        <button
          style={s.searchBtn}
          onClick={isSearching ? onCancel : onSearch}
          disabled={!isSearching && !canSearch}
        >
          {isSearching ? 'Cancel' : 'Search'}
        </button>
      </div>
    </div>
  );
}
