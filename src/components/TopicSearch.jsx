import React, { useState, useEffect, useRef } from 'react';
import { COLORS, FONTS } from '../constants.js';
import { searchTopics } from '../api.js';

// 'level' is not returned by /topics — infer from structure.
// If topic.subfield is present the item is a leaf Topic; if only topic.field, it's a Subfield.
function inferLevel(topic) {
  if (topic.subfield) return 3; // leaf Topic
  if (topic.field)    return 2; // Subfield
  return null;
}

function levelLabel(topic) {
  const l = inferLevel(topic);
  if (l === 3) return 'Topic';
  if (l === 2) return 'Subfield';
  return '';
}
const DEBOUNCE_MS = 350;

/**
 * Autofill topic input with pill multi-select.
 * Topics are levels 3 (Subfield) and 4 (Topic) only.
 *
 * Props:
 *   selectedTopics     [{ id, display_name, level, parentField }]
 *   setSelectedTopics  setter
 *   disabled           bool — disable input during fetch
 */
export default function TopicSearch({ selectedTopics, setSelectedTopics, disabled }) {
  const [query, setSuggestions_query] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [focused, setFocused]         = useState(false);
  const debounceRef = useRef(null);
  const abortRef    = useRef(null);
  const inputRef    = useRef(null);

  // Alias for clarity
  const query2 = query;
  const setQuery = setSuggestions_query;

  useEffect(() => {
    const q = query2.trim();
    if (!q) { setSuggestions([]); setOpen(false); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const results = await searchTopics(q, abortRef.current.signal);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        if (err.name !== 'AbortError') setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query2]);

  function addTopic(topic) {
    if (selectedTopics.some(t => t.id === topic.id)) return;
    setSelectedTopics(prev => [
      ...prev,
      {
        id:           topic.id,
        display_name: topic.display_name,
        level:        inferLevel(topic),
        parentField:  topic.field?.display_name ?? '',
      },
    ]);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTopic(id) {
    setSelectedTopics(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div>
      {/* Pills */}
      {selectedTopics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {selectedTopics.map(t => (
            <span key={t.id} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 7px 3px 10px',
              backgroundColor: `${COLORS.blue}18`,
              border: `1px solid ${COLORS.blue}40`,
              borderRadius: 20,
              fontSize: 11,
              color: COLORS.blueLight,
              fontFamily: FONTS.sans,
            }}>
              {t.display_name}
              {!disabled && (
                <button
                  onClick={() => removeTopic(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 1px',
                    color: COLORS.blue,
                    cursor: 'pointer',
                    fontSize: 15,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={`Remove ${t.display_name}`}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input + dropdown */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={query2}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (suggestions.length > 0) setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 160); }}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
          disabled={disabled}
          placeholder="Search topics and subfields…"
          style={{
            width: '100%',
            padding: '7px 10px',
            backgroundColor: COLORS.surface2,
            border: `1px solid ${focused ? COLORS.blue : COLORS.border2}`,
            borderRadius: 6,
            color: disabled ? COLORS.textMuted : COLORS.textPrimary,
            fontFamily: FONTS.mono,
            fontSize: 12,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />

        {open && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 3px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surface1,
            border: `1px solid ${COLORS.border2}`,
            borderRadius: 6,
            overflow: 'hidden',
            zIndex: 300,
            boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
          }}>
            {suggestions.map((topic, i) => {
              const already = selectedTopics.some(t => t.id === topic.id);
              const parentLabel = [
                topic.field?.display_name,
                topic.subfield?.display_name,
              ].filter(Boolean).join(' › ');

              return (
                <div
                  key={topic.id}
                  onMouseDown={e => { e.preventDefault(); if (!already) addTopic(topic); }}
                  style={{
                    padding: '8px 10px',
                    cursor: already ? 'default' : 'pointer',
                    opacity: already ? 0.38 : 1,
                    borderBottom: i < suggestions.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!already) e.currentTarget.style.backgroundColor = COLORS.surface2; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{
                      fontSize: 12,
                      color: COLORS.textPrimary,
                      fontFamily: FONTS.sans,
                      fontWeight: 500,
                    }}>
                      {topic.display_name}
                    </div>
                    {parentLabel && (
                      <div style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        fontFamily: FONTS.sans,
                        marginTop: 2,
                      }}>
                        {parentLabel}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    fontFamily: FONTS.sans,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}>
                    {levelLabel(topic)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
