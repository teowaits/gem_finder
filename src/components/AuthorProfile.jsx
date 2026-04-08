import React, { useEffect, useRef } from 'react';
import { COLORS, FONTS, ORCID_BASE_URL } from '../constants.js';
import { fetchAuthorCareer, fetchAuthorEarliestWork, fetchAuthorRecentVenues } from '../api.js';

/**
 * On-demand author profile panel. Fetches on first render for a given authorId,
 * then caches the result in loadedProfiles (Map managed by parent).
 *
 * Always shows the first listed author of the work (work.authorships[0]).
 *
 * Profile object shape:
 *   { status: 'loading'|'done'|'error', displayName, institution, citedByCount,
 *     worksCount, orcidId, sinceYear, topTopics: string[], venues: string[], error }
 */
export default function AuthorProfile({ authorId, loadedProfiles, setLoadedProfiles }) {
  const abortRef = useRef(null);
  const profile  = loadedProfiles.get(authorId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Already loading or loaded — nothing to do
    if (profile !== undefined) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    // Mark as loading immediately so concurrent mounts don't double-fetch
    setLoadedProfiles(prev => {
      const next = new Map(prev);
      next.set(authorId, { status: 'loading' });
      return next;
    });

    async function load() {
      try {
        // Call 1 + 2a in parallel: career summary and earliest work
        const [career, earliest] = await Promise.all([
          fetchAuthorCareer(authorId, signal),
          fetchAuthorEarliestWork(authorId, signal),
        ]);

        // Call 2b: recent venue history
        const recentWorks = await fetchAuthorRecentVenues(authorId, signal);

        // Deduplicate venue names, preserving order
        const seenVenues = new Set();
        const venues = [];
        for (const w of recentWorks) {
          const name = w.primary_location?.source?.display_name;
          if (name && !seenVenues.has(name)) {
            seenVenues.add(name);
            venues.push(name);
          }
        }

        const institution = career.last_known_institutions?.[0]?.display_name ?? null;
        const sinceYear   = earliest?.publication_date?.slice(0, 4) ?? null;
        const topTopics   = (career.topics ?? []).slice(0, 3).map(t => t.display_name);

        // Normalise ORCID to bare ID for display/linking
        const rawOrcid    = career.orcid ?? null;
        const orcidId     = rawOrcid?.replace('https://orcid.org/', '') ?? null;

        setLoadedProfiles(prev => {
          const next = new Map(prev);
          next.set(authorId, {
            status: 'done',
            displayName:  career.display_name ?? null,
            institution,
            citedByCount: career.cited_by_count ?? 0,
            worksCount:   career.works_count   ?? 0,
            orcidId,
            sinceYear,
            topTopics,
            venues,
          });
          return next;
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setLoadedProfiles(prev => {
          const next = new Map(prev);
          next.set(authorId, { status: 'error', error: err.message });
          return next;
        });
      }
    }

    load();
    return () => controller.abort();
  }, [authorId]); // profile intentionally omitted — checked at mount time only

  const s = {
    box: {
      marginTop: 8,
      padding: '10px 12px',
      backgroundColor: `${COLORS.blue}08`,
      border: `1px solid ${COLORS.border2}`,
      borderRadius: 6,
    },
    heading: {
      fontSize: 10,
      fontWeight: 600,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom: 4,
      display: 'block',
    },
    authorName: {
      fontSize: 13,
      fontWeight: 600,
      color: COLORS.textPrimary,
      fontFamily: FONTS.sans,
      marginBottom: 6,
      display: 'block',
    },
    orcidLink: {
      fontSize: 11,
      color: COLORS.blue,
      fontFamily: FONTS.mono,
      textDecoration: 'none',
      display: 'inline-block',
      marginBottom: 4,
    },
    row: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      lineHeight: 1.7,
    },
    key: {
      color: COLORS.textMuted,
    },
    muted: {
      color: COLORS.textMuted,
    },
  };

  if (!profile || profile.status === 'loading') {
    return (
      <div style={s.box}>
        <span style={s.heading}>First author · profile</span>
        <div style={{ ...s.row, color: COLORS.textMuted, fontStyle: 'italic' }}>Loading…</div>
      </div>
    );
  }

  if (profile.status === 'error') {
    return (
      <div style={s.box}>
        <span style={s.heading}>First author · profile</span>
        <div style={{ fontSize: 11, color: COLORS.red, fontFamily: FONTS.sans }}>
          Could not load profile.
        </div>
      </div>
    );
  }

  const { displayName, institution, citedByCount, worksCount, orcidId, sinceYear, topTopics, venues } = profile;

  return (
    <div style={s.box}>
      <span style={s.heading}>First author · profile</span>
      {displayName && <span style={s.authorName}>{displayName}</span>}

      {orcidId && (
        <a
          href={`${ORCID_BASE_URL}${orcidId}`}
          target="_blank"
          rel="noreferrer"
          style={s.orcidLink}
          title="View ORCID profile"
        >
          ORCID: {orcidId}
        </a>
      )}

      {institution && (
        <div style={s.row}>
          <span style={s.key}>Institution: </span>{institution}
        </div>
      )}

      <div style={s.row}>
        <span style={s.key}>Publications: </span>
        {(worksCount ?? 0).toLocaleString()}
        {sinceYear && (
          <span style={s.muted}> · publishing since {sinceYear}</span>
        )}
      </div>

      <div style={s.row}>
        <span style={s.key}>Career citations: </span>
        {(citedByCount ?? 0).toLocaleString()}
      </div>

      {topTopics.length > 0 && (
        <div style={s.row}>
          <span style={s.key}>Research areas: </span>
          {topTopics.join(', ')}
        </div>
      )}

      {venues.length > 0 && (
        <div style={{ ...s.row, marginTop: 2 }}>
          <span style={s.key}>Usually publishes in: </span>
          {venues.join(', ')}
        </div>
      )}
    </div>
  );
}
