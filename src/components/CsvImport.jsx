import React, { useState, useRef } from 'react';
import { COLORS, FONTS, IMPORT_TOPIC_LIMIT, IMPORT_AUTHOR_LIMIT } from '../constants.js';
import { parseImportCsv } from '../utils.js';

const SELECTION_CAP = IMPORT_TOPIC_LIMIT; // 25 — same value, topics + authors combined

const TYPE_LABEL = { topic: 'Topic', subfield: 'Subfield', author: 'Author' };
const TYPE_COLOR = {
  topic:    COLORS.blue,
  subfield: COLORS.blue,
  author:   COLORS.green,
};

const itemKey = item => `${item.type}:${item.openalex_id}`;

/**
 * CSV import panel.
 * States: upload → preview (with selection) → committed (with live toggling).
 *
 * Accepts flexible CSV headers — see parseImportCsv in utils.js.
 * All rows are imported; up to 25 can be selected for the search.
 */
export default function CsvImport({
  importedItems,       setImportedItems,
  activeImportIds,     setActiveImportIds,
  importAuthorScope,   setImportAuthorScope,
  disabled,
}) {
  const [parsedData,        setParsedData]        = useState(null);  // { topics, authors, all }
  const [pendingSelection,  setPendingSelection]  = useState(new Set()); // selection in preview
  const [parseError,        setParseError]        = useState('');
  const [filename,          setFilename]          = useState('');
  const [dragging,          setDragging]          = useState(false);
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
        // Pre-select the first SELECTION_CAP rows
        const defaultSel = new Set(data.all.slice(0, SELECTION_CAP).map(itemKey));
        setParsedData(data);
        setPendingSelection(defaultSel);
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

  function togglePending(key) {
    setPendingSelection(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < SELECTION_CAP) {
        next.add(key);
      }
      return next;
    });
  }

  function toggleActive(key) {
    setActiveImportIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < SELECTION_CAP) {
        next.add(key);
      }
      return next;
    });
  }

  function handleConfirm() {
    if (!parsedData) return;
    setImportedItems(parsedData.all);
    setActiveImportIds(new Set(pendingSelection));
    setParsedData(null);
    setFilename('');
  }

  function handleClear() {
    setImportedItems([]);
    setActiveImportIds(new Set());
    setParsedData(null);
    setParseError('');
    setFilename('');
  }

  function handleReset() {
    setParsedData(null);
    setParseError('');
    setFilename('');
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
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
    listHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    listTitle: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontFamily: FONTS.sans,
      fontWeight: 600,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: 160,
    },
    selectionCount: atCap => ({
      fontSize: 10,
      color: atCap ? COLORS.amber : COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontWeight: atCap ? 600 : 400,
      flexShrink: 0,
    }),
    itemList: {
      maxHeight: 200,
      overflowY: 'auto',
      backgroundColor: COLORS.surface2,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      marginBottom: 8,
    },
    itemRow: (isLast, dimmed) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '5px 9px',
      borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
      opacity: dimmed ? 0.45 : 1,
    }),
    checkbox: dimmed => ({
      flexShrink: 0,
      accentColor: COLORS.blue,
      cursor: dimmed ? 'not-allowed' : 'pointer',
      width: 12,
      height: 12,
    }),
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
    confirmBtn: disabled => ({
      flex: 1,
      padding: '6px 0',
      backgroundColor: disabled ? 'transparent' : `${COLORS.blue}20`,
      border: `1px solid ${disabled ? COLORS.border : `${COLORS.blue}50`}`,
      borderRadius: 5,
      color: disabled ? COLORS.textMuted : COLORS.blueLight,
      fontFamily: FONTS.sans,
      fontSize: 11,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
    }),
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
      maxHeight: 220,
      overflowY: 'auto',
    },
    hintText: {
      padding: '6px 10px',
      fontSize: 10,
      color: COLORS.textMuted,
      fontFamily: FONTS.sans,
      fontStyle: 'italic',
      borderTop: `1px solid ${COLORS.border}`,
    },
  };

  // ── Committed view ──────────────────────────────────────────────────────────
  if (importedItems.length > 0) {
    const atCap     = activeImportIds.size >= SELECTION_CAP;
    const topicCnt  = importedItems.filter(i => i.type === 'topic' || i.type === 'subfield').length;
    const authorCnt = importedItems.filter(i => i.type === 'author').length;

    const hasActiveTopics  = [...activeImportIds].some(k => k.startsWith('topic:') || k.startsWith('subfield:'));
    const hasActiveAuthors = [...activeImportIds].some(k => k.startsWith('author:'));
    const parts     = [
      topicCnt  > 0 ? `${topicCnt} topic${topicCnt  !== 1 ? 's' : ''}` : null,
      authorCnt > 0 ? `${authorCnt} author${authorCnt !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    return (
      <div style={s.committedBox}>
        <div style={s.committedHeader}>
          <span style={s.committedSummary}>{parts} imported</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={s.selectionCount(atCap)}>
              {activeImportIds.size} / {SELECTION_CAP} selected
            </span>
            {!disabled && (
              <button style={s.clearBtn} onClick={handleClear} title="Clear — upload a different file">✕</button>
            )}
          </div>
        </div>
        <div style={s.committedList}>
          {importedItems.map((item, idx) => {
            const key     = itemKey(item);
            const checked = activeImportIds.has(key);
            const dimmed  = !checked && atCap;
            const isLast  = idx === importedItems.length - 1;
            const color   = TYPE_COLOR[item.type] ?? COLORS.textMuted;
            return (
              <div
                key={key}
                style={s.itemRow(isLast, dimmed)}
                onClick={() => !disabled && toggleActive(key)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || dimmed}
                  onChange={() => !disabled && toggleActive(key)}
                  onClick={e => e.stopPropagation()}
                  style={s.checkbox(disabled || dimmed)}
                />
                <span style={s.typeBadge(color)}>{TYPE_LABEL[item.type] ?? item.type}</span>
                <span style={s.itemName} title={item.display_name}>{item.display_name}</span>
              </div>
            );
          })}
        </div>
        {atCap && (
          <div style={s.hintText}>25-item cap reached — deselect a row to add another</div>
        )}
        {(hasActiveTopics || hasActiveAuthors) && (
          <div style={{
            borderTop: `1px solid ${COLORS.border}`,
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {hasActiveTopics && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <span style={{
                  flexShrink: 0,
                  fontSize: 9,
                  fontFamily: FONTS.mono,
                  fontWeight: 700,
                  color: COLORS.blue,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 1,
                  border: `1px solid ${COLORS.blue}50`,
                  borderRadius: 3,
                  padding: '1px 4px',
                }}>OR</span>
                <span style={{
                  fontSize: 10,
                  color: COLORS.textMuted,
                  fontFamily: FONTS.sans,
                  lineHeight: 1.4,
                }}>
                  Works matching <em>any</em> selected topic area
                </span>
              </div>
            )}
            {hasActiveAuthors && (
              <div>
                <div style={{
                  fontSize: 10,
                  color: COLORS.textMuted,
                  fontFamily: FONTS.sans,
                  marginBottom: 5,
                }}>Author scope</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { value: 'repository', label: 'Repository only' },
                    { value: 'all',        label: 'All works' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => !disabled && setImportAuthorScope(value)}
                      disabled={disabled}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        fontSize: 10,
                        fontFamily: FONTS.sans,
                        fontWeight: importAuthorScope === value ? 600 : 400,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        borderRadius: 4,
                        border: `1px solid ${importAuthorScope === value ? `${COLORS.blue}60` : COLORS.border2}`,
                        backgroundColor: importAuthorScope === value ? `${COLORS.blue}18` : 'transparent',
                        color: importAuthorScope === value ? COLORS.blueLight : COLORS.textMuted,
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Preview view ────────────────────────────────────────────────────────────
  if (parsedData) {
    const atCap     = pendingSelection.size >= SELECTION_CAP;
    const selCount  = pendingSelection.size;
    const total     = parsedData.all.length;

    return (
      <>
        <div style={s.listHeader}>
          <span style={s.listTitle} title={filename}>{filename}</span>
          <span style={s.selectionCount(atCap)}>
            {selCount} / {SELECTION_CAP} selected
            {total > SELECTION_CAP ? ` (${total} rows)` : ''}
          </span>
        </div>
        <div style={s.itemList}>
          {parsedData.all.map((item, idx) => {
            const key     = itemKey(item);
            const checked = pendingSelection.has(key);
            const dimmed  = !checked && atCap;
            const isLast  = idx === parsedData.all.length - 1;
            const color   = TYPE_COLOR[item.type] ?? COLORS.textMuted;
            return (
              <div
                key={`${key}-${idx}`}
                style={s.itemRow(isLast, dimmed)}
                onClick={() => togglePending(key)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={dimmed}
                  onChange={() => togglePending(key)}
                  onClick={e => e.stopPropagation()}
                  style={s.checkbox(dimmed)}
                />
                <span style={s.typeBadge(color)}>{TYPE_LABEL[item.type] ?? item.type}</span>
                <span style={s.itemName} title={item.display_name}>{item.display_name}</span>
              </div>
            );
          })}
        </div>
        {atCap && (
          <div style={{ ...s.hintText, borderTop: 'none', padding: '0 0 6px 0' }}>
            25-item cap reached — deselect a row to add another
          </div>
        )}
        <div style={s.btnRow}>
          <button
            style={s.confirmBtn(selCount === 0)}
            onClick={handleConfirm}
            disabled={selCount === 0}
          >
            Load — search with {selCount} item{selCount !== 1 ? 's' : ''}
          </button>
          <button style={s.resetBtn} onClick={handleReset} title="Upload a different file">↩</button>
        </div>
      </>
    );
  }

  // ── Upload view ─────────────────────────────────────────────────────────────
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
        <span style={s.schemaLabel}>Accepted CSV formats</span>

        <div style={{ marginBottom: 4, color: COLORS.textSecondary, fontSize: 10 }}>
          Topics / subfields:
        </div>
        <div style={s.schemaCols}>type, OpenAlex ID, display_name, notes</div>

        <div style={{ marginBottom: 4, color: COLORS.textSecondary, fontSize: 10 }}>
          Authors:
        </div>
        <div style={s.schemaCols}>type, Name, ORCID, Open Alex ID, Notes</div>

        <div style={s.schemaDivider} />

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

        <div style={s.schemaDivider} />

        <div>All rows imported · top 25 pre-selected</div>
        <div style={s.schemaNote}>Extra columns are ignored · header row required</div>
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
