import React, { useState } from 'react';
import { COLORS, FONTS } from '../constants.js';

const DOT_COLOR = {
  green: COLORS.green,
  amber: COLORS.amber,
  grey:  COLORS.textMuted,
};

export default function StatusBadge({ status }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: DOT_COLOR[status] ?? COLORS.textMuted,
          flexShrink: 0,
          cursor: 'default',
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 7px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: COLORS.surface1,
          border: `1px solid ${COLORS.border2}`,
          borderRadius: 5,
          padding: '5px 9px',
          fontSize: 11,
          color: COLORS.textSecondary,
          fontFamily: FONTS.sans,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 400,
          boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
        }}>
          Verify publication status before contacting
        </div>
      )}
    </div>
  );
}
