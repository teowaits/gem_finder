import React from 'react';
import { COLORS, FONTS } from '../constants.js';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * Shows a list of author candidates after a name search.
 * User picks one to confirm, or closes to search again.
 */
export default function DisambiguationCard({ candidates, onSelect, onClose, loading }) {
  const s = {
    container: {
      marginTop: 8,
      backgroundColor: COLORS.surface2,
      border: `1px solid ${COLORS.border2}`,
      borderRadius: 7,
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 10px',
      borderBottom: `1px solid ${COLORS.border}`,
    },
    headerText: {
      fontSize: 10,
      fontWeight: 600,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      padding: '1px 3px',
      cursor: 'pointer',
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 1,
    },
    candidate: {
      padding: '9px 10px',
      borderBottom: `1px solid ${COLORS.border}`,
      cursor: 'pointer',
      transition: 'background 0.1s',
    },
    candidateLast: {
      padding: '9px 10px',
      cursor: 'pointer',
      transition: 'background 0.1s',
    },
    name: {
      fontSize: 12,
      fontWeight: 600,
      color: COLORS.textPrimary,
      fontFamily: FONTS.sans,
    },
    inst: {
      marginTop: 2,
      fontSize: 11,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
    },
    stats: {
      marginTop: 2,
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    topics: {
      marginTop: 2,
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontStyle: 'italic',
    },
    loading: {
      padding: '16px 10px',
      textAlign: 'center',
      fontSize: 12,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
    },
    empty: {
      padding: '14px 10px',
      fontSize: 12,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      lineHeight: 1.5,
    },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={s.headerText}>Select author</span>
        <button style={s.closeBtn} onClick={onClose} title="Close">✕</button>
      </div>

      {loading ? (
        <div style={s.loading}>Searching…</div>
      ) : candidates.length === 0 ? (
        <div style={s.empty}>
          No authors found.<br />
          Try a different spelling or search by ORCID.
        </div>
      ) : (
        candidates.map((author, idx) => {
          const inst       = author.last_known_institutions?.[0]?.display_name;
          const topTopics  = (author.topics ?? []).slice(0, 2).map(t => t.display_name).join(', ');
          const isLast     = idx === candidates.length - 1;
          return (
            <div
              key={author.id}
              style={isLast ? s.candidateLast : s.candidate}
              onClick={() => onSelect(author)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${COLORS.blue}12`; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
            >
              <div style={s.name}>{author.display_name}</div>
              {inst      && <div style={s.inst}>{inst}</div>}
              <div style={s.stats}>
                {formatCount(author.works_count)} works · {formatCount(author.cited_by_count)} citations
              </div>
              {topTopics && <div style={s.topics}>{topTopics}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
