import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Download, ChevronRight, BookOpen, BarChart3, FileText, FileCode, Printer, ChevronDown } from 'lucide-react';


/* =============================================================
   Scroll Progress Bar
   ============================================================= */
function ScrollProgress({ containerRef }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const pct = scrollHeight <= clientHeight ? 100 : (scrollTop / (scrollHeight - clientHeight)) * 100;
      setProgress(pct);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [containerRef]);

  return (
    <div style={{ height: '2px', backgroundColor: 'var(--color-border-subtle)', position: 'relative' }}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${progress}%`,
          backgroundColor: 'var(--color-accent-teal)',
          transition: 'width 80ms linear',
        }}
      />
    </div>
  );
}

/* =============================================================
   Extract headings from markdown text
   ============================================================= */
function extractHeadings(markdown) {
  const lines = markdown.split('\n');
  const headings = [];
  for (const line of lines) {
    const m2 = line.match(/^## (.+)/);
    const m3 = line.match(/^### (.+)/);
    if (m2) {
      const text = m2[1].trim();
      headings.push({ level: 2, text, id: slugify(text) });
    } else if (m3) {
      const text = m3[1].trim();
      headings.push({ level: 3, text, id: slugify(text) });
    }
  }
  return headings;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

/* =============================================================
   Table of Contents Sidebar
   ============================================================= */
function TableOfContents({ headings, activeId }) {
  return (
    <nav
      style={{
        width: '220px',
        flexShrink: 0,
        position: 'sticky',
        top: '24px',
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        paddingRight: '8px',
        alignSelf: 'flex-start',
      }}
    >
      <div className="mono-label" style={{ marginBottom: '12px' }}>Contents</div>
      {headings.map((h, i) => (
        <a
          key={i}
          href={`#${h.id}`}
          onClick={e => {
            e.preventDefault();
            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          style={{
            display: 'block',
            padding: h.level === 2 ? '4px 0' : '3px 0 3px 14px',
            fontSize: h.level === 2 ? '12px' : '11px',
            fontWeight: h.level === 2 ? '500' : '400',
            color: activeId === h.id ? 'var(--color-accent-teal)' : 'var(--color-text-secondary)',
            borderLeft: h.level === 3 ? `1px solid ${activeId === h.id ? 'var(--color-accent-teal)' : 'var(--color-border-subtle)'}` : 'none',
            textDecoration: 'none',
            lineHeight: 1.4,
            transition: 'color 150ms ease, border-color 150ms ease',
          }}
          onMouseEnter={e => { if (activeId !== h.id) e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={e => { if (activeId !== h.id) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

/* =============================================================
   ASCII / Diagram Block
   ============================================================= */
function AsciiDiagram({ children }) {
  const content = Array.isArray(children) ? children.join('') : String(children || '');
  return (
    <div style={{ margin: '20px 0', border: '1px solid var(--color-accent-brass)', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 14px',
        backgroundColor: 'var(--color-accent-brass-faint)',
        borderBottom: '1px solid var(--color-accent-brass)',
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3D2800', display: 'inline-block' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3D2800', display: 'inline-block' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3D2800', display: 'inline-block' }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--color-accent-brass)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Architecture Diagram
        </span>
      </div>
      {/* Content */}
      <pre style={{
        margin: 0, padding: '20px 24px',
        backgroundColor: '#0A0B0C',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        lineHeight: 1.6,
        color: '#C8C7C4',
        overflowX: 'auto',
        whiteSpace: 'pre',
      }}>
        <code>{content}</code>
      </pre>
    </div>
  );
}

/* =============================================================
   Standard Code Block
   ============================================================= */
function CodeBlock({ children, lang }) {
  const content = Array.isArray(children) ? children.join('') : String(children || '');
  return (
    <div style={{ margin: '16px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {lang && (
        <div style={{
          padding: '4px 14px',
          backgroundColor: 'var(--color-surface-secondary)',
          borderBottom: '1px solid var(--color-border)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
          color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {lang}
        </div>
      )}
      <pre style={{
        margin: 0, padding: '16px',
        backgroundColor: 'var(--color-surface-secondary)',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
        lineHeight: 1.6, color: 'var(--color-accent-teal)',
        overflowX: 'auto', whiteSpace: 'pre',
      }}>
        <code>{content}</code>
      </pre>
    </div>
  );
}

/* =============================================================
   Styled Comparison Table
   ============================================================= */
function ComparisonTable({ children }) {
  return (
    <div style={{ overflowX: 'auto', margin: '20px 0', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        {children}
      </table>
    </div>
  );
}
function TableHead({ children }) {
  return <thead style={{ backgroundColor: 'var(--color-accent-teal-faint)', borderBottom: '1px solid var(--color-accent-teal-dim)' }}>{children}</thead>;
}
function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}
function TableRow({ children, isHeader }) {
  return (
    <tr style={{
      borderBottom: '1px solid var(--color-border-subtle)',
      backgroundColor: isHeader ? 'transparent' : undefined,
    }}
    onMouseEnter={e => { if (!isHeader) e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'; }}
    onMouseLeave={e => { if (!isHeader) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {children}
    </tr>
  );
}
function TableCell({ children, isHeader }) {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag style={{
      padding: '10px 14px',
      textAlign: 'left',
      fontFamily: isHeader ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
      fontSize: isHeader ? '10px' : '13px',
      fontWeight: isHeader ? '600' : '400',
      color: isHeader ? 'var(--color-accent-teal)' : 'var(--color-text-secondary)',
      letterSpacing: isHeader ? '0.06em' : '0',
      textTransform: isHeader ? 'uppercase' : 'none',
      borderRight: '1px solid var(--color-border-subtle)',
      verticalAlign: 'top',
    }}>
      {children}
    </Tag>
  );
}

/* =============================================================
   Callout / Blockquote
   ============================================================= */
function Callout({ children }) {
  return (
    <div style={{
      margin: '16px 0',
      padding: '14px 18px',
      borderLeft: '2px solid var(--color-accent-brass)',
      backgroundColor: 'var(--color-accent-brass-faint)',
      borderRadius: '0 6px 6px 0',
    }}>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

/* =============================================================
   References Panel (extracts ## References from markdown)
   ============================================================= */
function ReferencesPanel({ markdown }) {
  const refMatch = markdown.match(/##\s+References?\s*\n([\s\S]*?)(?=\n##\s|\n---|\n$|$)/i);
  if (!refMatch) return null;

  const refLines = refMatch[1].trim().split('\n').filter(l => l.trim());
  const refs = refLines.map(line => {
    // Match: [N] Title — URL
    const m = line.match(/^\[?(\d+)\]?\s*(.+?)\s*[—–-]\s*(https?:\/\/\S+)/);
    if (m) {
      let domain = '';
      try { domain = new URL(m[3]).hostname.replace('www.', ''); } catch {}
      return { num: m[1], title: m[2].trim(), url: m[3], domain };
    }
    // Fallback: just the line text
    return { num: null, title: line.replace(/^\[\d+\]\s*/, '').trim(), url: '', domain: '' };
  });

  if (refs.length === 0) return null;

  return (
    <div className="panel" style={{ padding: '24px', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BookOpen size={14} style={{ color: 'var(--color-accent-teal)' }} />
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>References</h4>
        <span className="mono-label">{refs.length} sources cited</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
        {refs.map((ref, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 12px', borderRadius: '6px',
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {ref.num && (
              <span style={{
                flexShrink: 0, width: '22px', height: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', backgroundColor: 'var(--color-accent-teal-faint)',
                border: '1px solid var(--color-accent-teal-dim)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
                fontWeight: '600', color: 'var(--color-accent-teal)',
              }}>
                {ref.num}
              </span>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.4 }}>
                {ref.title}
              </span>
              {ref.domain && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                  {ref.domain}
                </span>
              )}
            </div>
            {ref.url && (
              <a href={ref.url} target="_blank" rel="noopener noreferrer"
                style={{ flexShrink: 0, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================
   Strip References section from markdown (rendered separately)
   ============================================================= */
function stripReferences(markdown) {
  return markdown.replace(/\n##\s+References?\s*\n[\s\S]*?(?=\n##\s|\n---\s*\n##|\n$|$)/i, '');
}

/* =============================================================
   Custom react-markdown component overrides
   ============================================================= */
function buildComponents(setActiveId) {
  return {
    // Headings — add id anchors for TOC
    h1: ({ children }) => (
      <h1 id={slugify(String(children))} style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 20px', letterSpacing: '-0.02em', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const id = slugify(String(children));
      return (
        <h2 id={id} style={{ fontSize: '17px', fontWeight: '600', color: 'var(--color-text-primary)', margin: '36px 0 12px', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '3px', height: '18px', backgroundColor: 'var(--color-accent-teal)', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
          {children}
        </h2>
      );
    },
    h3: ({ children }) => {
      const id = slugify(String(children));
      return (
        <h3 id={id} style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)', margin: '24px 0 8px', letterSpacing: '-0.005em' }}>
          {children}
        </h3>
      );
    },
    h4: ({ children }) => (
      <h4 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', margin: '18px 0 6px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {children}
      </h4>
    ),

    // Paragraph
    p: ({ children }) => (
      <p style={{ color: '#C8C7C4', fontSize: '14px', lineHeight: 1.75, margin: '0 0 16px' }}>
        {children}
      </p>
    ),

    // Strong / Em
    strong: ({ children }) => <strong style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>{children}</strong>,
    em:     ({ children }) => <em style={{ color: 'var(--color-accent-brass)', fontStyle: 'italic' }}>{children}</em>,

    // Lists
    ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '0 0 16px', listStyleType: 'none' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '0 0 16px' }}>{children}</ol>,
    li: ({ children, ordered }) => (
      <li style={{ color: '#C8C7C4', fontSize: '14px', lineHeight: 1.7, marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        {!ordered && <span style={{ color: 'var(--color-accent-teal)', flexShrink: 0, marginTop: '8px', display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-accent-teal)' }} />}
        <span>{children}</span>
      </li>
    ),

    // Code / pre
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px', padding: '1px 6px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px', color: 'var(--color-accent-teal)',
          }}>
            {children}
          </code>
        );
      }
      const lang = (className || '').replace('language-', '').toLowerCase();
      if (['ascii', 'diagram', 'text', 'architecture'].includes(lang) || lang === '') {
        // Check if it looks like an ASCII diagram (contains box drawing chars or arrows)
        const content = Array.isArray(children) ? children.join('') : String(children || '');
        const isAscii = lang === 'ascii' || lang === 'diagram' || lang === 'architecture' ||
                        /[─│┌┐└┘├┤┬┴┼\-\|><=\[\]\(\)#\+\/\\].*\n/.test(content);
        if (isAscii || lang === 'ascii' || lang === 'diagram') {
          return <AsciiDiagram>{children}</AsciiDiagram>;
        }
      }
      return <CodeBlock lang={lang || null}>{children}</CodeBlock>;
    },

    // Blockquote → callout
    blockquote: ({ children }) => <Callout>{children}</Callout>,

    // Horizontal rule
    hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: '28px 0' }} />,

    // Links
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--color-accent-teal)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
        {children}
      </a>
    ),

    // GFM Tables
    table:  ({ children }) => <ComparisonTable>{children}</ComparisonTable>,
    thead:  ({ children }) => <TableHead>{children}</TableHead>,
    tbody:  ({ children }) => <TableBody>{children}</TableBody>,
    tr:     ({ children, isHeader }) => <TableRow isHeader={isHeader}>{children}</TableRow>,
    th:     ({ children }) => <TableCell isHeader>{children}</TableCell>,
    td:     ({ children }) => <TableCell>{children}</TableCell>,
  };
}

/* =============================================================
   Quality Score Panel
   ============================================================= */
function QualityScores({ criticScores }) {
  const entries = Object.entries(criticScores);
  if (entries.length === 0) return null;

  const avg = (entries.reduce((s, [, v]) => s + Number(v), 0) / entries.length).toFixed(1);
  const avgColor = avg >= 8 ? 'var(--color-success)' : avg >= 6 ? 'var(--color-accent-teal)' : 'var(--color-warning)';

  return (
    <div className="panel" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <BarChart3 size={14} style={{ color: 'var(--color-accent-teal)' }} />
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
              Critic Council Evaluation
            </h3>
          </div>
          <span className="mono-label">Peer-reviewed across {entries.length} quality dimensions</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '26px', fontWeight: '600', color: avgColor, letterSpacing: '-0.02em' }}>
              {avg}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>/10</span>
          </div>
          <span className="mono-label">avg score</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entries.length}, 1fr)`, gap: '20px' }}>
        {entries.map(([key, score]) => {
          const pct   = Math.min(100, Number(score) * 10);
          const color = Number(score) >= 7 ? 'var(--color-success)' : Number(score) >= 5 ? 'var(--color-accent-teal)' : 'var(--color-warning)';
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span className="mono-label" style={{ textTransform: 'capitalize' }}>{key}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {Number(score).toFixed(1)}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 800ms ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================================
   Word Count Estimate
   ============================================================= */
function wordCount(text) {
  return text ? text.trim().split(/\s+/).length : 0;
}

/* =============================================================
   Convert Markdown to styled HTML for Word (.doc) Export
   ============================================================= */
function convertMarkdownToHtml(markdown) {
  if (!markdown) return '';

  const codeBlocks = [];
  const tables = [];

  // 1. Extract code blocks (protect from regex)
  let text = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const placeholder = `___CODEBLOCK_${codeBlocks.length}___`;
    codeBlocks.push(
      `<pre style="background-color: #0A0B0C; color: #C8C7C4; font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5pt; padding: 12pt; border: 1pt solid #2C2F35; border-radius: 4pt; white-space: pre-wrap; margin: 14pt 0;"><code>${escaped}</code></pre>`
    );
    return placeholder;
  });

  // 2. Extract GFM tables
  const lines = text.split('\n');
  const newLines = [];
  let inTable = false;
  let currentTableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s-:\t|]+\|$/.test(line)) {
        continue; // delimiter row
      }
      inTable = true;
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      currentTableRows.push(cells);
    } else {
      if (inTable) {
        const placeholder = `___TABLE_${tables.length}___`;
        let tHtml = '<table style="width: 100%; border-collapse: collapse; margin: 14pt 0;">';
        currentTableRows.forEach((row, rIdx) => {
          tHtml += '<tr>';
          row.forEach(cell => {
            if (rIdx === 0) {
              tHtml += `<th style="background-color: #e6f4f1; color: #1d7260; font-family: sans-serif; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; padding: 8pt; border: 1pt solid #cbd5e1; text-align: left;">${cell}</th>`;
            } else {
              tHtml += `<td style="border: 1pt solid #cbd5e1; padding: 8pt; font-size: 10pt; color: #334155;">${cell}</td>`;
            }
          });
          tHtml += '</tr>';
        });
        tHtml += '</table>';
        tables.push(tHtml);
        newLines.push(placeholder);
        inTable = false;
        currentTableRows = [];
      }
      newLines.push(lines[i]);
    }
  }
  if (inTable) {
    const placeholder = `___TABLE_${tables.length}___`;
    let tHtml = '<table style="width: 100%; border-collapse: collapse; margin: 14pt 0;">';
    currentTableRows.forEach((row, rIdx) => {
      tHtml += '<tr>';
      row.forEach(cell => {
        if (rIdx === 0) {
          tHtml += `<th style="background-color: #e6f4f1; color: #1d7260; font-family: sans-serif; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; padding: 8pt; border: 1pt solid #cbd5e1; text-align: left;">${cell}</th>`;
        } else {
          tHtml += `<td style="border: 1pt solid #cbd5e1; padding: 8pt; font-size: 10pt; color: #334155;">${cell}</td>`;
        }
      });
      tHtml += '</tr>';
    });
    tHtml += '</table>';
    tables.push(tHtml);
    newLines.push(placeholder);
  }

  text = newLines.join('\n');

  // 3. Blockquotes
  text = text.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left: 3.5pt solid #c9a227; background-color: #fefce8; color: #451a03; padding: 8pt 12pt; margin: 12pt 0; font-style: italic;">$1</blockquote>');

  // 4. Headings
  text = text.replace(/^# (.*$)/gm, '<h1 style="font-size: 20pt; color: #0f172a; border-bottom: 1.5pt solid #2ba88c; padding-bottom: 4pt; margin-top: 24pt; margin-bottom: 12pt;">$1</h1>');
  text = text.replace(/^## (.*$)/gm, '<h2 style="font-size: 15pt; color: #1e293b; border-left: 3.5pt solid #2ba88c; padding-left: 8pt; margin-top: 20pt; margin-bottom: 10pt;">$1</h2>');
  text = text.replace(/^### (.*$)/gm, '<h3 style="font-size: 13pt; color: #334155; margin-top: 16pt; margin-bottom: 8pt;">$1</h3>');
  text = text.replace(/^#### (.*$)/gm, '<h4 style="font-size: 11pt; color: #475569; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt;">$1</h4>');

  // 5. Inline styles
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code style="font-family: Consolas, monospace; font-size: 10pt; background-color: #f1f5f9; color: #0f766e; padding: 2pt 4pt; border-radius: 2pt;">$1</code>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2ba88c; text-decoration: underline;">$1</a>');

  // 6. Lists
  text = text.replace(/^\s*[-*]\s+(.*)$/gm, '<li style="margin-bottom: 4pt; color: #334155;">$1</li>');
  text = text.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li style="margin-bottom: 4pt; color: #334155;">$2</li>');
  text = text.replace(/(<li[\s\S]*?<\/li>\n?)+/g, match => `<ul style="margin-bottom: 12pt; padding-left: 20pt;">\n${match}</ul>\n`);

  // 7. Paragraphs
  const splitParagraphs = text.split(/\n\s*\n/);
  text = splitParagraphs.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('___CODEBLOCK_') ||
      trimmed.startsWith('___TABLE_')
    ) {
      return trimmed;
    }
    return `<p style="margin-bottom: 10pt; line-height: 1.6; color: #334155; text-align: justify;">${trimmed}</p>`;
  }).join('\n\n');

  // 8. Re-insert codeblocks and tables
  codeBlocks.forEach((cb, idx) => {
    text = text.replace(`___CODEBLOCK_${idx}___`, cb);
  });
  tables.forEach((tbl, idx) => {
    text = text.replace(`___TABLE_${idx}___`, tbl);
  });

  return text;
}

/* =============================================================
   Main ReportRenderer
   ============================================================= */
export default function ReportRenderer({ report, topic }) {
  const scrollRef = useRef(null);
  const exportMenuRef = useRef(null);
  const [activeId, setActiveId] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (!report) return null;

  const { content, sources = [], critic_scores = {} } = report;

  const headings = useMemo(() => extractHeadings(content || ''), [content]);
  const bodyContent = useMemo(() => stripReferences(content || ''), [content]);
  const wc = useMemo(() => wordCount(content), [content]);
  const components = useMemo(() => buildComponents(setActiveId), []);

  // Click outside listener for export menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // IntersectionObserver for TOC active section
  useEffect(() => {
    const ids = headings.filter(h => h.level === 2).map(h => h.id);
    if (ids.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 }
    );

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  /* Export Handlers */
  const handleExportMarkdown = () => {
    if (!content) return;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const titleText = topic || 'Swarm AI Deep Research Report';

    let mdHeader = `# ${titleText}\n\n`;
    mdHeader += `> **Platform:** SwarmAI Decentralized Research Engine\n`;
    mdHeader += `> **Date:** ${dateStr}\n`;
    if (critic_scores && Object.keys(critic_scores).length > 0) {
      const scoresList = Object.entries(critic_scores).map(([k, v]) => `${k}: ${v}/10`).join(' | ');
      mdHeader += `> **Critic Evaluation:** ${scoresList}\n`;
    }
    mdHeader += `\n---\n\n`;

    const fullMd = mdHeader + content;

    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedTitle = (topic || 'Research_Report').replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.download = `${sanitizedTitle}_Report.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDoc = () => {
    if (!content) return;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const titleText = topic || 'Swarm AI Deep Research Report';
    const bodyHtml = convertMarkdownToHtml(content);

    let scoresHtml = '';
    if (critic_scores && Object.keys(critic_scores).length > 0) {
      const entries = Object.entries(critic_scores);
      const avg = (entries.reduce((s, [, v]) => s + Number(v), 0) / entries.length).toFixed(1);
      scoresHtml = `
        <div style="background-color: #f1f5f9; border: 1pt solid #cbd5e1; padding: 10pt 14pt; margin-bottom: 20pt; border-radius: 6pt;">
          <strong style="color: #0f172a; font-size: 11pt;">Critic Council Evaluation (${avg}/10)</strong>
          <div style="font-size: 9.5pt; color: #475569; margin-top: 4pt;">
            ${entries.map(([k, v]) => `<span style="margin-right: 12pt;"><strong>${k}:</strong> ${Number(v).toFixed(1)}/10</span>`).join('')}
          </div>
        </div>
      `;
    }

    const docTemplate = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${titleText}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForCustomXerox/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { margin: 1in; }
    body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; background: #ffffff; }
    .header-box { border-bottom: 2.5pt solid #2ba88c; padding-bottom: 12pt; margin-bottom: 20pt; }
    .doc-title { font-size: 24pt; font-weight: bold; color: #0f172a; margin: 0 0 6pt 0; }
    .doc-sub { font-size: 10pt; color: #64748b; font-family: sans-serif; }
    h1 { font-size: 20pt; color: #0f172a; border-bottom: 1.5pt solid #e2e8f0; padding-bottom: 4pt; margin-top: 24pt; margin-bottom: 12pt; page-break-after: avoid; }
    h2 { font-size: 15pt; color: #1e293b; border-left: 3.5pt solid #2ba88c; padding-left: 8pt; margin-top: 20pt; margin-bottom: 10pt; page-break-after: avoid; }
    h3 { font-size: 12.5pt; color: #334155; margin-top: 16pt; margin-bottom: 8pt; page-break-after: avoid; }
    h4 { font-size: 11pt; color: #475569; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid; }
    p { margin-bottom: 10pt; text-align: justify; color: #334155; }
    ul, ol { margin-bottom: 12pt; padding-left: 20pt; }
    li { margin-bottom: 4pt; color: #334155; }
    blockquote { border-left: 3.5pt solid #c9a227; background-color: #fefce8; padding: 8pt 12pt; margin: 12pt 0; color: #451a03; font-style: italic; }
    pre { background-color: #0a0b0c; color: #c8c7c4; font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5pt; padding: 12pt; border-radius: 4pt; overflow-x: auto; white-space: pre-wrap; margin: 14pt 0; page-break-inside: avoid; }
    code { font-family: 'Consolas', 'Courier New', monospace; font-size: 10pt; background-color: #f1f5f9; color: #0f766e; padding: 2pt 4pt; border-radius: 2pt; }
    table { width: 100%; border-collapse: collapse; margin: 14pt 0; page-break-inside: avoid; }
    th { background-color: #e6f4f1; color: #1d7260; font-family: sans-serif; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; padding: 8pt; border: 1pt solid #cbd5e1; text-align: left; }
    td { border: 1pt solid #cbd5e1; padding: 8pt; font-size: 10pt; color: #334155; }
    tr:nth-child(even) { background-color: #f8fafc; }
    a { color: #2ba88c; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header-box">
    <h1 class="doc-title">${titleText}</h1>
    <div class="doc-sub">
      <strong>SwarmAI Decentralized Research Engine</strong> | Date: ${dateStr}
    </div>
  </div>
  ${scoresHtml}
  <div class="content">
    ${bodyHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([docTemplate], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedTitle = (topic || 'Research_Report').replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.download = `${sanitizedTitle}_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ===========================================================
          Critic Score Panel
          =========================================================== */}
      <QualityScores criticScores={critic_scores} />

      {/* ===========================================================
          Main Report Card
          =========================================================== */}
      <div className="panel" style={{ overflow: 'hidden', position: 'relative' }}>

        {/* Print-only Header (Visible when printing / saving to PDF) */}
        <div className="print-only-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <h1 style={{ fontSize: '22pt', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0', border: 'none', padding: 0 }}>
                {topic || 'Deep Research Report'}
              </h1>
              <span style={{ fontSize: '10pt', color: '#64748b', fontFamily: 'monospace' }}>
                SwarmAI Decentralized Research Engine
              </span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '9pt', color: '#64748b' }}>
              <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div>Word Count: ~{wc.toLocaleString()} words</div>
              {critic_scores && Object.keys(critic_scores).length > 0 && (
                <div style={{ display: 'flex', gap: '16px', fontSize: '9.5pt', color: '#334155', marginTop: '8px', paddingTop: '8px', borderTop: '1pt solid #e2e8f0' }}>
                  {Object.entries(critic_scores).map(([key, score]) => (
                    <span key={key}><strong>{key.toUpperCase()}:</strong> {Number(score).toFixed(1)}/10</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll progress */}
        <ScrollProgress containerRef={scrollRef} />

        {/* Document header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-secondary)',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Agent chain */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {['Researcher', 'Analyst', 'Critic'].map((agent, i, arr) => (
                <React.Fragment key={agent}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '4px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: '500',
                    color: 'var(--color-text-secondary)', letterSpacing: '0.04em',
                  }}>
                    {agent}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight size={11} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Word count */}
            <span className="mono-label">~{wc.toLocaleString()} words</span>

            {/* Sources count */}
            {sources.length > 0 && (
              <span className="mono-label">{sources.length} sources</span>
            )}
          </div>

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              id="export-report-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary"
              style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={12} />
              <span>Export</span>
              <ChevronDown size={11} style={{ transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }} />
            </button>

            {showExportMenu && (
              <div
                className="export-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '230px',
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                  padding: '6px',
                  zIndex: 100,
                  animation: 'fadeIn 120ms ease-out',
                }}
              >
                <div className="mono-label" style={{ padding: '6px 10px', fontSize: '9px', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: '4px' }}>
                  Export Options
                </div>

                {/* Option 1: Markdown */}
                <button
                  id="export-md-btn"
                  onClick={() => {
                    handleExportMarkdown();
                    setShowExportMenu(false);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'transparent',
                    color: 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileText size={15} style={{ color: 'var(--color-accent-teal)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>Export as Markdown (.md)</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Raw markdown report file</div>
                  </div>
                </button>

                {/* Option 2: Word Doc */}
                <button
                  id="export-doc-btn"
                  onClick={() => {
                    handleExportDoc();
                    setShowExportMenu(false);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'transparent',
                    color: 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileCode size={15} style={{ color: 'var(--color-accent-brass)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>Export as Word (.doc)</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Formatted document</div>
                  </div>
                </button>

                {/* Option 3: Print / PDF */}
                <button
                  id="export-pdf-btn"
                  onClick={() => {
                    window.print();
                    setShowExportMenu(false);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'transparent',
                    color: 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Printer size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>Print / Save as PDF</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Neat PDF print layout</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout: TOC + Body */}
        <div style={{ display: 'flex', gap: '0' }}>
          {/* TOC Sidebar */}
          {headings.length > 2 && (
            <div style={{
              width: '220px', flexShrink: 0,
              padding: '24px 16px 24px 20px',
              borderRight: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-surface-secondary)',
            }}>
              <TableOfContents headings={headings} activeId={activeId} />
            </div>
          )}

          {/* Report Body */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto',
              maxHeight: 'calc(100vh - 220px)',
              padding: '32px 40px',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {bodyContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* ===========================================================
          References Panel (extracted from ## References section)
          =========================================================== */}
      <ReferencesPanel markdown={content} />

      {/* ===========================================================
          Sources from Researcher (if separate from References)
          =========================================================== */}
      {sources && sources.length > 0 && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={14} style={{ color: 'var(--color-text-muted)' }} />
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
              Web Sources Retrieved
            </h4>
            <span className="mono-label">{sources.length} pages crawled</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {sources.map((src, idx) => {
              let domain = '';
              try { domain = new URL(src.url || '').hostname.replace('www.', ''); } catch {}
              return (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '6px', gap: '8px',
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-teal)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {src.title || 'Untitled Source'}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                      {domain}
                    </span>
                  </div>
                  <ExternalLink size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '2px' }} />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
