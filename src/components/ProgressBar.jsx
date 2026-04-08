import React from 'react';
import { COLORS, FONTS, RESULTS_CAP } from '../constants.js';

/**
 * Inline progress indicator shown during preflight and fetch phases.
 * Renders nothing during idle / done / error — callers don't need to gate it.
 *
 * Props:
 *   phase       'idle'|'preflight'|'running'|'done'|'error'
 *   logLine     string — live status message
 *   fetched     number — works received so far
 *   total       number — meta.count from API (0 = unknown)
 */
export default function ProgressBar({ phase, logLine, fetched = 0, total = 0 }) {
  if (phase === 'idle' || phase === 'done' || phase === 'error') return null;

  const cap            = Math.min(total, RESULTS_CAP);
  const hasDeterminate = phase === 'running' && cap > 0;
  const pct            = hasDeterminate ? Math.min(100, Math.round((fetched / cap) * 100)) : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Track */}
      <div style={{
        height: 2,
        backgroundColor: COLORS.border2,
        borderRadius: 1,
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        {hasDeterminate ? (
          <div style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: COLORS.blue,
            borderRadius: 1,
            transition: 'width 0.25s ease',
          }} />
        ) : (
          <div style={{
            height: '100%',
            width: '35%',
            backgroundColor: COLORS.blue,
            borderRadius: 1,
            animation: 'gemIndeterminate 1.3s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Spinner + log line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 12,
          height: 12,
          border: `2px solid ${COLORS.blue}30`,
          borderTop: `2px solid ${COLORS.blue}`,
          borderRadius: '50%',
          animation: 'gemSpin 0.7s linear infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11,
          color: COLORS.textMuted,
          fontFamily: FONTS.sans,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {logLine || (phase === 'preflight' ? 'Checking result count…' : 'Fetching results…')}
        </span>
      </div>
    </div>
  );
}
