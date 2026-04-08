import React, { useState, useMemo } from 'react';
import { COLORS, FONTS } from '../constants.js';
import StatusBadge from './StatusBadge.jsx';
import AuthorProfile from './AuthorProfile.jsx';
import { computeStatusIndicator, reconstructAbstract } from '../utils.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// "arXiv (Cornell University)" → "arXiv"
function normaliseSourceName(name) {
  if (!name) return null;
  const paren = name.indexOf(' (');
  return paren > -1 ? name.slice(0, paren) : name;
}

// "https://doi.org/10.48550/arXiv.2401.00001" → "10.48550/arXiv.2401.00001"
function normaliseDoi(doi) {
  if (!doi) return null;
  return doi.replace(/^https?:\/\/doi\.org\//i, '');
}

export default function ResultCard({
  work,
  isSelected,
  onToggleSelect,
  matchedCriterion,
  loadedProfiles,
  setLoadedProfiles,
}) {
  const [authorsExpanded,  setAuthorsExpanded]  = useState(false);
  const [abstractExpanded, setAbstractExpanded] = useState(false);
  const [topicsExpanded,   setTopicsExpanded]   = useState(false);
  const [profileExpanded,  setProfileExpanded]  = useState(false);

  const status   = useMemo(() => computeStatusIndicator(work), [work]);
  const abstract = useMemo(() => reconstructAbstract(work.abstract_inverted_index), [work]);

  const authors    = work.authorships ?? [];
  const first      = authors[0];
  const firstName  = first?.author?.display_name ?? '';
  const firstInst  = first?.institutions?.[0]?.display_name ?? '';
  const firstAuthorId = first?.author?.id ?? null;
  const extraCount = Math.max(0, authors.length - 1);
  const landingUrl = work.primary_location?.landing_page_url;
  const sourceName = normaliseSourceName(work.primary_location?.source?.display_name);
  const doi        = normaliseDoi(work.doi);

  // Primary topic path
  const primaryPath = [
    work.primary_topic?.field?.display_name,
    work.primary_topic?.subfield?.display_name,
    work.primary_topic?.display_name,
  ].filter(Boolean).join(' › ');

  // Additional topics (all except the primary)
  const allTopics       = work.topics ?? [];
  const primaryTopicId  = work.primary_topic?.id;
  const extraTopics     = allTopics.filter(t => t.id !== primaryTopicId);

  const s = {
    card: {
      backgroundColor: COLORS.surface2,
      border: `1px solid ${isSelected ? `${COLORS.blue}60` : COLORS.border}`,
      borderRadius: 8,
      padding: '13px 14px',
      marginBottom: 8,
      transition: 'border-color 0.15s',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '13px 12px 1fr',
      columnGap: 8,
      alignItems: 'start',
    },
    contentCell: { gridColumn: 3 },
    checkbox: {
      marginTop: 3,
      width: 13,
      height: 13,
      accentColor: COLORS.blue,
      cursor: 'pointer',
      flexShrink: 0,
    },
    badgeCell: { paddingTop: 4 },
    title: {
      fontSize: 13,
      fontWeight: 500,
      color: COLORS.textPrimary,
      fontFamily: FONTS.sans,
      lineHeight: 1.45,
      textDecoration: 'none',
      display: 'block',
    },
    metaRow: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 5,
      fontSize: 12,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      lineHeight: 1.5,
    },
    sep: { color: COLORS.textMuted, margin: '0 6px' },
    expandBtn: {
      background: 'none',
      border: 'none',
      padding: 0,
      color: COLORS.blue,
      fontFamily: FONTS.sans,
      fontSize: 12,
      cursor: 'pointer',
      lineHeight: 'inherit',
    },
    sourceRow: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '2px 8px',
      marginTop: 5,
      fontSize: 11,
      fontFamily: FONTS.sans,
    },
    sourceTag: {
      padding: '1px 6px',
      backgroundColor: `${COLORS.blue}18`,
      border: `1px solid ${COLORS.blue}35`,
      borderRadius: 4,
      color: COLORS.blueLight,
      fontSize: 10,
      fontFamily: FONTS.mono,
    },
    doiLink: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontFamily: FONTS.mono,
      textDecoration: 'none',
      wordBreak: 'break-all',
    },
    authorsList: {
      marginTop: 5,
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      lineHeight: 1.75,
    },
    topicPrimary: {
      marginTop: 5,
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    topicsToggle: {
      display: 'inline-block',
      marginTop: 4,
      background: 'none',
      border: 'none',
      padding: 0,
      fontSize: 11,
      color: COLORS.blue,
      fontFamily: FONTS.sans,
      cursor: 'pointer',
    },
    topicsList: {
      marginTop: 4,
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      lineHeight: 1.7,
      paddingLeft: 10,
      borderLeft: `2px solid ${COLORS.border2}`,
    },
    abstractToggle: {
      display: 'inline-block',
      marginTop: 6,
      background: 'none',
      border: 'none',
      padding: 0,
      fontSize: 11,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      cursor: 'pointer',
    },
    profileToggle: {
      display: 'inline-block',
      marginTop: 5,
      background: 'none',
      border: 'none',
      padding: 0,
      fontSize: 11,
      color: COLORS.blue,
      fontFamily: FONTS.sans,
      cursor: 'pointer',
    },
    abstractText: {
      marginTop: 5,
      fontSize: 12,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      lineHeight: 1.65,
    },
    matchTag: {
      display: 'inline-block',
      marginTop: 6,
      padding: '2px 7px',
      backgroundColor: `${COLORS.amber}18`,
      border: `1px solid ${COLORS.amber}40`,
      borderRadius: 4,
      fontSize: 10,
      color: COLORS.amberLight,
      fontFamily: FONTS.sans,
    },
  };

  return (
    <div style={s.card}>
      <div style={s.grid}>
        {/* Col 1: checkbox */}
        <input
          type="checkbox"
          style={s.checkbox}
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select "${work.display_name}" for export`}
        />

        {/* Col 2: status badge */}
        <div style={s.badgeCell}>
          <StatusBadge status={status} />
        </div>

        {/* Col 3: all content */}
        <div style={s.contentCell}>

          {/* Title */}
          {landingUrl ? (
            <a href={landingUrl} target="_blank" rel="noreferrer" style={s.title}>
              {work.display_name}
            </a>
          ) : (
            <span style={s.title}>{work.display_name}</span>
          )}

          {/* First author · institution · +N more · date · citations */}
          <div style={s.metaRow}>
            {firstName && <span style={{ fontWeight: 500 }}>{firstName}</span>}
            {firstInst && <><span style={s.sep}>·</span><span>{firstInst}</span></>}
            {extraCount > 0 && (
              <>
                <span style={s.sep}>·</span>
                <button style={s.expandBtn} onClick={() => setAuthorsExpanded(v => !v)}>
                  +{extraCount} author{extraCount !== 1 ? 's' : ''} {authorsExpanded ? '▴' : '▾'}
                </button>
              </>
            )}
            {work.publication_date && (
              <><span style={s.sep}>·</span>
              <span style={{ color: COLORS.textMuted }}>{formatDate(work.publication_date)}</span></>
            )}
            {work.cited_by_count > 0 && (
              <><span style={s.sep}>·</span>
              <span style={{ color: COLORS.textMuted }}>
                {work.cited_by_count.toLocaleString()} citation{work.cited_by_count !== 1 ? 's' : ''}
              </span></>
            )}
          </div>

          {/* Expanded authors */}
          {authorsExpanded && extraCount > 0 && (
            <div style={s.authorsList}>
              {authors.slice(1).map((a, i) => {
                const inst = a.institutions?.[0]?.display_name;
                return (
                  <div key={a.author?.id ?? i}>
                    {a.author?.display_name ?? 'Unknown'}
                    {inst && <span style={{ opacity: 0.6 }}> · {inst}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Source tag + DOI */}
          {(sourceName || doi) && (
            <div style={s.sourceRow}>
              {sourceName && <span style={s.sourceTag}>{sourceName}</span>}
              {doi && (
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noreferrer"
                  style={s.doiLink}
                >
                  {doi}
                </a>
              )}
            </div>
          )}

          {/* Primary topic path */}
          {primaryPath && (
            <div style={s.topicPrimary}>{primaryPath}</div>
          )}

          {/* All topics (collapsible) */}
          {extraTopics.length > 0 && (
            <>
              <button
                style={s.topicsToggle}
                onClick={() => setTopicsExpanded(v => !v)}
              >
                {topicsExpanded ? 'Hide' : `+${extraTopics.length} more topic${extraTopics.length !== 1 ? 's' : ''}`} {topicsExpanded ? '▴' : '▾'}
              </button>
              {topicsExpanded && (
                <div style={s.topicsList}>
                  {extraTopics.map(t => {
                    const path = [
                      t.field?.display_name,
                      t.subfield?.display_name,
                      t.display_name,
                    ].filter(Boolean).join(' › ');
                    return <div key={t.id}>{path}</div>;
                  })}
                </div>
              )}
            </>
          )}

          {/* Abstract */}
          {abstract && (
            abstractExpanded ? (
              <>
                <p style={s.abstractText}>{abstract}</p>
                <button style={s.abstractToggle} onClick={() => setAbstractExpanded(false)}>
                  Abstract ▴
                </button>
              </>
            ) : (
              <button style={s.abstractToggle} onClick={() => setAbstractExpanded(true)}>
                Abstract ▾
              </button>
            )
          )}

          {/* Author profile (on-demand) — always the first listed author */}
          {firstAuthorId && (
            <>
              <button
                style={s.profileToggle}
                onClick={() => setProfileExpanded(v => !v)}
              >
                Profile{firstName ? ` · ${firstName}` : ''} {profileExpanded ? '▴' : '▾'}
              </button>
              {profileExpanded && (
                <AuthorProfile
                  authorId={firstAuthorId}
                  loadedProfiles={loadedProfiles}
                  setLoadedProfiles={setLoadedProfiles}
                />
              )}
            </>
          )}

          {/* Import match tag (Phase 5) */}
          {matchedCriterion && (
            <div style={s.matchTag}>{matchedCriterion}</div>
          )}
        </div>
      </div>
    </div>
  );
}
