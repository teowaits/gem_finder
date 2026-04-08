import React, { useState, useRef } from 'react';
import { COLORS, FONTS, ORCID_PATTERN, ORCID_BASE_URL } from '../constants.js';
import { searchAuthors, searchAuthorByOrcid } from '../api.js';
import DisambiguationCard from './DisambiguationCard.jsx';

/**
 * Author search input with ORCID detection, disambiguation card,
 * confirmed-author display, and "Repository only / All works" toggle.
 */
export default function AuthorSearch({
  authorQuery,
  setAuthorQuery,
  confirmedAuthor,
  setConfirmedAuthor,
  authorAllWorks,
  setAuthorAllWorks,
  disabled,
}) {
  const [candidates,    setCandidates]    = useState([]);
  const [showDisambig,  setShowDisambig]  = useState(false);
  const [searching,     setSearching]     = useState(false);
  const [searchError,   setSearchError]   = useState('');
  const abortRef = useRef(null);

  const query   = authorQuery.trim();
  const isOrcid = ORCID_PATTERN.test(query);

  async function handleFind() {
    if (!query || disabled) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setSearching(true);
    setSearchError('');
    setCandidates([]);
    setShowDisambig(false);

    try {
      if (isOrcid) {
        // ORCID input — bypass disambiguation, confirm directly
        const author = await searchAuthorByOrcid(query, signal);
        if (author) {
          setConfirmedAuthor(author);
        } else {
          setSearchError('No author found with that ORCID. Check the format and try again.');
        }
      } else {
        const results = await searchAuthors(query, signal);
        setCandidates(results);
        setShowDisambig(true);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSearchError(err.message || 'Search failed. Please try again.');
      }
    } finally {
      setSearching(false);
    }
  }

  function handleSelect(author) {
    setConfirmedAuthor(author);
    setShowDisambig(false);
    setCandidates([]);
  }

  function handleClear() {
    abortRef.current?.abort();
    setConfirmedAuthor(null);
    setAuthorQuery('');
    setCandidates([]);
    setShowDisambig(false);
    setSearchError('');
  }

  const s = {
    input: {
      width: '100%',
      padding: '7px 9px',
      backgroundColor: COLORS.surface2,
      border: `1px solid ${COLORS.border2}`,
      borderRadius: 5,
      color: COLORS.textPrimary,
      fontFamily: FONTS.sans,
      fontSize: 12,
      outline: 'none',
      boxSizing: 'border-box',
    },
    hint: {
      marginTop: 5,
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    orcidHint: {
      marginTop: 5,
      fontSize: 10,
      color: COLORS.blue,
      fontFamily: FONTS.sans,
    },
    findBtn: {
      marginTop: 6,
      width: '100%',
      padding: '6px 0',
      backgroundColor: searching ? COLORS.surface2 : `${COLORS.blue}20`,
      border: `1px solid ${searching ? COLORS.border2 : `${COLORS.blue}50`}`,
      borderRadius: 5,
      color: searching ? COLORS.textMuted : COLORS.blueLight,
      fontFamily: FONTS.sans,
      fontSize: 11,
      fontWeight: 600,
      cursor: searching || disabled || !query ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
    },
    error: {
      marginTop: 6,
      fontSize: 11,
      color: COLORS.red,
      fontFamily: FONTS.sans,
      lineHeight: 1.45,
    },
    // Confirmed state
    confirmedBox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '8px 10px',
      backgroundColor: `${COLORS.blue}12`,
      border: `1px solid ${COLORS.blue}40`,
      borderRadius: 6,
    },
    confirmedInfo: {
      flex: 1,
      minWidth: 0,
    },
    confirmedName: {
      fontSize: 12,
      fontWeight: 600,
      color: COLORS.blueLight,
      fontFamily: FONTS.sans,
    },
    confirmedInst: {
      marginTop: 2,
      fontSize: 11,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    confirmedOrcid: {
      display: 'block',
      marginTop: 2,
      fontSize: 10,
      color: COLORS.blue,
      fontFamily: FONTS.mono,
      textDecoration: 'none',
    },
    clearBtn: {
      flexShrink: 0,
      background: 'none',
      border: 'none',
      padding: '1px 3px',
      cursor: 'pointer',
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 1,
    },
    toggleRow: {
      marginTop: 12,
    },
    radioLabel: active => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '3px 0',
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
    }),
    radioLabelText: active => ({
      fontSize: 12,
      color: active ? COLORS.textPrimary : COLORS.textSecondary,
      fontFamily: FONTS.sans,
      lineHeight: 1.3,
    }),
    radioHint: {
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      marginTop: 1,
    },
  };

  // ── Confirmed author view ──
  if (confirmedAuthor) {
    const inst  = confirmedAuthor.last_known_institutions?.[0]?.display_name;
    const orcid = confirmedAuthor.orcid?.replace('https://orcid.org/', '');

    return (
      <>
        <div style={s.confirmedBox}>
          <div style={s.confirmedInfo}>
            <div style={s.confirmedName}>{confirmedAuthor.display_name}</div>
            {inst  && <div style={s.confirmedInst}>{inst}</div>}
            {orcid && (
              <a
                href={`${ORCID_BASE_URL}${orcid}`}
                target="_blank"
                rel="noreferrer"
                style={s.confirmedOrcid}
              >
                ORCID: {orcid}
              </a>
            )}
          </div>
          {!disabled && (
            <button style={s.clearBtn} onClick={handleClear} title="Clear — search for a different author">
              ✕
            </button>
          )}
        </div>

        {/* Repository only / All works toggle */}
        <div style={s.toggleRow}>
          {[
            {
              value: false,
              label: 'Repository only',
              hint: 'Preprints on arXiv, chemRxiv, etc.',
            },
            {
              value: true,
              label: 'All works',
              hint: 'All publications by this author',
            },
          ].map(({ value, label, hint }) => (
            <label key={label} style={s.radioLabel(authorAllWorks === value)}>
              <input
                type="radio"
                name="authorAllWorks"
                checked={authorAllWorks === value}
                onChange={() => { if (!disabled) setAuthorAllWorks(value); }}
                disabled={disabled}
                style={{
                  accentColor: COLORS.blue,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={s.radioLabelText(authorAllWorks === value)}>{label}</div>
                <div style={s.radioHint}>{hint}</div>
              </div>
            </label>
          ))}
        </div>
      </>
    );
  }

  // ── Search input view ──
  return (
    <>
      <input
        style={s.input}
        type="text"
        value={authorQuery}
        onChange={e => { setAuthorQuery(e.target.value); setSearchError(''); setShowDisambig(false); }}
        onKeyDown={e => { if (e.key === 'Enter' && !disabled && !searching) handleFind(); }}
        placeholder="Author name or ORCID"
        disabled={disabled}
        autoComplete="off"
      />

      {isOrcid
        ? <div style={s.orcidHint}>ORCID detected — will match directly</div>
        : <div style={s.hint}>Enter a name, then select from results</div>
      }

      <button
        style={s.findBtn}
        onClick={handleFind}
        disabled={disabled || searching || !query}
      >
        {searching ? 'Searching…' : 'Find author'}
      </button>

      {searchError && <div style={s.error}>{searchError}</div>}

      {showDisambig && (
        <DisambiguationCard
          candidates={candidates}
          onSelect={handleSelect}
          onClose={() => setShowDisambig(false)}
          loading={searching}
        />
      )}
    </>
  );
}
