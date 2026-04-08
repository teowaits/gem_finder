import React, { useState, useRef } from 'react';
import { COLORS, FONTS } from '../constants.js';
import { parseImportCsv } from '../utils.js';

const TYPE_LABEL = { topic: 'Topic', subfield: 'Subfield', author: 'Author' };
const TYPE_COLOR = {
  topic:    COLORS.blue,
  subfield: COLORS.blue,
  author:   COLORS.green,
};

/**
 * CSV import panel.
 * States: upload → preview → committed.
 * Uses parseImportCsv (already implemented in utils.js) for validation.
 */
export default function CsvImport({ importedItems, setImportedItems, disabled }) {
  const [parsedData,  setParsedData]  = useState(null);   // { topics, authors, all }
  const [parseError,  setParseError]  = useState('');
  const [filename,    setFilename]    = useState('');
  const [dragging,    setDragging]    = useState(false);
  const fileInputRef = useRef(null);

  function readFile(file) {
    if (!file) return;
    setFilename(file.name);
    setParseError('');
    setParsedData(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = parseImportCsv(e.target.result);
        if (data.all.length === 0) throw new Error('No valid rows found in this CSV.');
        setParsedData(data);
      } catch (err) {
        setParsedData(null);
        setParseError(err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleFileInput(e) {
    readFile(e.target.files[0]);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }

  function handleConfirm() {
    if (!parsedData) return;
    setImportedItems(parsedData.all);
    setParsedData(null);
    setFilename('');
  }

  function handleClear() {
    setImportedItems([]);
    setParsedData(null);
    setParseError('');
    setFilename('');
  }

  function handleReset() {
    setParsedData(null);
    setParseError('');
    setFilename('');
  }

  const topicCount  = importedItems.filter(i => i.type === 'topic' || i.type === 'subfield').length;
  const authorCount = importedItems.filter(i => i.type === 'author').length;

  const s = {
    dropZone: active => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '18px 12px',
      border: `1px dashed ${active ? COLORS.blue : COLORS.border2}`,
      borderRadius: 7,
      backgroundColor: active ? `${COLORS.blue}08` : COLORS.surface2,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
      textAlign: 'center',
    }),
    dropLabel: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
    },
    schemaBlock: {
      marginTop: 10,
      padding: '9px 10px',
      backgroundColor: COLORS.surface2,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      fontSize: 10,
      fontFamily: FONTS.sans,
      color: COLORS.textMuted,
      lineHeight: 1.6,
    },
    schemaLabel: {
      display: 'block',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: COLORS.textMuted,
      marginBottom: 5,
    },
    schemaCols: {
      fontFamily: FONTS.mono,
      fontSize: 10,
      color: COLORS.textSecondary,
      wordBreak: 'break-all',
      marginBottom: 6,
    },
    schemaRow: {
      display: 'flex',
      gap: 5,
      marginBottom: 2,
    },
    schemaType: color => ({
      flexShrink: 0,
      fontFamily: FONTS.mono,
      fontWeight: 600,
      color,
    }),
    schemaDivider: {
      borderTop: `1px solid ${COLORS.border}`,
      margin: '6px 0',
    },
    schemaNote: {
      color: COLORS.textMuted,
      fontStyle: 'italic',
    },
    error: {
      marginTop: 8,
      fontSize: 11,
      color: COLORS.red,
      fontFamily: FONTS.sans,
      lineHeight: 1.5,
    },
    // Preview state
    previewHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    previewTitle: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      fontWeight: 600,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: 160,
    },
    previewCounts: {
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      flexShrink: 0,
    },
    itemList: {
      maxHeight: 180,
      overflowY: 'auto',
      backgroundColor: COLORS.surface2,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      marginBottom: 8,
    },
    itemRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '5px 9px',
      borderBottom: `1px solid ${COLORS.border}`,
    },
    itemRowLast: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '5px 9px',
    },
    typeBadge: color => ({
      flexShrink: 0,
      fontSize: 9,
      fontFamily: FONTS.mono,
      fontWeight: 600,
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      width: 48,
    }),
    itemName: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    btnRow: {
      display: 'flex',
      gap: 6,
    },
    confirmBtn: {
      flex: 1,
      padding: '6px 0',
      backgroundColor: `${COLORS.blue}20`,
      border: `1px solid ${COLORS.blue}50`,
      borderRadius: 5,
      color: COLORS.blueLight,
      fontFamily: FONTS.sans,
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    resetBtn: {
      padding: '6px 10px',
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.border2}`,
      borderRadius: 5,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontSize: 11,
      cursor: 'pointer',
    },
    // Committed state
    committedBox: {
      backgroundColor: `${COLORS.blue}08`,
      border: `1px solid ${COLORS.border2}`,
      borderRadius: 6,
      overflow: 'hidden',
    },
    committedHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 10px',
      borderBottom: `1px solid ${COLORS.border}`,
    },
    committedSummary: {
      fontSize: 11,
      fontWeight: 600,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
    },
    clearBtn: {
      background: 'none',
      border: 'none',
      padding: '1px 3px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 1,
    },
    committedList: {
      maxHeight: 200,
      overflowY: 'auto',
    },
  };

  // ── Committed view ──
  if (importedItems.length > 0) {
    const summary = [
      topicCount  > 0 ? `${topicCount} topic${topicCount  !== 1 ? 's' : ''}` : null,
      authorCount > 0 ? `${authorCount} author${authorCount !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    return (
      <div style={s.committedBox}>
        <div style={s.committedHeader}>
          <span style={s.committedSummary}>{summary} loaded</span>
          {!disabled && (
            <button style={s.clearBtn} onClick={handleClear} title="Clear — upload a different file">✕</button>
          )}
        </div>
        <div style={s.committedList}>
          {importedItems.map((item, idx) => {
            const isLast = idx === importedItems.length - 1;
            const color  = TYPE_COLOR[item.type] ?? COLORS.textMuted;
            return (
              <div key={`${item.type}-${item.openalex_id}`} style={isLast ? s.itemRowLast : s.itemRow}>
                <span style={s.typeBadge(color)}>{TYPE_LABEL[item.type] ?? item.type}</span>
                <span style={s.itemName} title={item.display_name}>{item.display_name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Preview view (file parsed, not yet committed) ──
  if (parsedData) {
    const topicsParsed  = parsedData.topics.length;
    const authorsParsed = parsedData.authors.length;
    const countStr = [
      topicsParsed  > 0 ? `${topicsParsed} topic${topicsParsed !== 1 ? 's' : ''}` : null,
      authorsParsed > 0 ? `${authorsParsed} author${authorsParsed !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    return (
      <>
        <div style={s.previewHeader}>
          <span style={s.previewTitle} title={filename}>{filename}</span>
          <span style={s.previewCounts}>{countStr}</span>
        </div>
        <div style={s.itemList}>
          {parsedData.all.map((item, idx) => {
            const isLast = idx === parsedData.all.length - 1;
            const color  = TYPE_COLOR[item.type] ?? COLORS.textMuted;
            return (
              <div key={`${item.type}-${item.openalex_id}-${idx}`} style={isLast ? s.itemRowLast : s.itemRow}>
                <span style={s.typeBadge(color)}>{TYPE_LABEL[item.type] ?? item.type}</span>
                <span style={s.itemName} title={item.display_name}>{item.display_name}</span>
              </div>
            );
          })}
        </div>
        <div style={s.btnRow}>
          <button style={s.confirmBtn} onClick={handleConfirm}>
            Load {parsedData.all.length} item{parsedData.all.length !== 1 ? 's' : ''}
          </button>
          <button style={s.resetBtn} onClick={handleReset} title="Upload a different file">↩</button>
        </div>
      </>
    );
  }

  // ── Upload view ──
  return (
    <>
      <div
        style={s.dropZone(dragging)}
        onClick={() => { if (!disabled) fileInputRef.current?.click(); }}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragEnter={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={disabled ? undefined : handleDrop}
      >
        <span style={s.dropLabel}>Drop CSV here or click to upload</span>
      </div>

      <div style={s.schemaBlock}>
        <span style={s.schemaLabel}>Expected CSV format</span>

        <div style={s.schemaCols}>
          type, openalex_id, display_name, notes, orcid
        </div>

        <div>
          <div style={s.schemaRow}>
            <span style={s.schemaType(COLORS.blue)}>topic</span>
            <span>— OpenAlex topic ID (e.g. T10104)</span>
          </div>
          <div style={s.schemaRow}>
            <span style={s.schemaType(COLORS.blue)}>subfield</span>
            <span>— OpenAlex subfield ID (e.g. S2208)</span>
          </div>
          <div style={s.schemaRow}>
            <span style={s.schemaType(COLORS.green)}>author</span>
            <span>— OpenAlex author ID (e.g. A5023888391)</span>
          </div>
        </div>

        <div style={s.schemaDivider} />

        <div>Max 25 topics/subfields · max 25 authors</div>
        <div style={s.schemaNote}>orcid column is optional; header row required</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileInput}
        disabled={disabled}
      />
      {parseError && <div style={s.error}>{parseError}</div>}
    </>
  );
}
