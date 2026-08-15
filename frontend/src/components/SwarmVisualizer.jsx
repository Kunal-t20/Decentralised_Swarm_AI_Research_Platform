import React, { useEffect, useRef } from 'react';
import { Search, BarChart2, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Terminal } from 'lucide-react';

/* =========================================================
   Instrument Panel Diagram
   ========================================================= */
function InstrumentDiagram({ researcherStatus, analystStatus, criticStatus, status }) {
  const agents = [
    { key: 'researcher', label: 'Researcher', sub: 'Web · RAG',    icon: Search,       agStatus: researcherStatus },
    { key: 'analyst',    label: 'Analyst',    sub: 'LLM Synthesis', icon: BarChart2,    agStatus: analystStatus    },
    { key: 'critic',     label: 'Critic',     sub: 'Peer Review',   icon: ShieldCheck,  agStatus: criticStatus     },
  ];

  function portStyle(agStatus) {
    if (agStatus === 'active') return {
      border: '1.25px solid var(--color-accent-teal)',
      backgroundColor: 'var(--color-accent-teal-faint)',
    };
    if (agStatus === 'completed') return {
      border: '1.25px solid var(--color-accent-teal-dim)',
      backgroundColor: '#0D3028',
    };
    return {
      border: '1.25px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-secondary)',
    };
  }

  function lineStyle(agStatus) {
    if (agStatus === 'active') return 'var(--color-accent-brass)';
    if (agStatus === 'completed') return 'var(--color-accent-teal-dim)';
    return 'var(--color-border)';
  }

  function iconColor(agStatus) {
    if (agStatus === 'active') return 'var(--color-accent-teal)';
    if (agStatus === 'completed') return 'var(--color-accent-teal-dim)';
    return 'var(--color-text-muted)';
  }

  const outcomeStyle =
    status === 'COMPLETED' ? { border: '1.25px solid var(--color-success)', backgroundColor: '#0A1F12', color: 'var(--color-success)' } :
    status === 'COMPLETED_WITH_WARNING' ? { border: '1.25px solid var(--color-warning)', backgroundColor: '#1A1000', color: 'var(--color-warning)' } :
    status === 'FAILED' ? { border: '1.25px solid var(--color-error)', backgroundColor: '#1A0606', color: 'var(--color-error)' } :
    { border: '1.25px solid var(--color-border)', backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Goal */}
      <div style={{
        padding: '5px 16px', border: '1.25px solid var(--color-border)',
        borderRadius: '4px', backgroundColor: 'var(--color-surface-secondary)',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
        color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Research Goal
      </div>

      {/* Vertical trunk */}
      <div style={{ width: '1.25px', height: '16px', backgroundColor: 'var(--color-border)' }} />

      {/* Agents row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {agents.map((ag, i) => {
          const Icon = ag.icon;
          return (
            <div key={ag.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '70px' }}>
              {/* Down connector */}
              <div style={{ width: '1.25px', height: '16px', backgroundColor: lineStyle(ag.agStatus) }} />
              {/* Hex port */}
              <div style={{ position: 'relative', width: '46px', height: '46px' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 200ms ease',
                  ...portStyle(ag.agStatus),
                }}>
                  <Icon size={14} style={{ color: iconColor(ag.agStatus) }} strokeWidth={1.25} />
                </div>
                {ag.agStatus === 'active' && (
                  <div style={{
                    position: 'absolute', inset: '-6px',
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                    border: '1px solid var(--color-accent-teal)',
                    animation: 'sonar-hex 1.6s ease-out 1',
                    opacity: 0,
                  }} />
                )}
              </div>
              {/* Labels */}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                {ag.label}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                {ag.sub}
              </span>
              {/* Down connector */}
              <div style={{ width: '1.25px', height: '16px', backgroundColor: lineStyle(ag.agStatus) }} />
            </div>
          );
        })}
      </div>

      {/* Outcome node */}
      <div style={{
        padding: '6px 20px', borderRadius: '4px',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: '600',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        transition: 'all 200ms ease',
        ...outcomeStyle,
      }}>
        {status === 'COMPLETED' ? 'Complete' :
         status === 'COMPLETED_WITH_WARNING' ? 'Complete w/ Warning' :
         status === 'FAILED' ? 'Failed' :
         status === 'RUNNING' ? 'Processing…' : 'Awaiting'}
      </div>
    </div>
  );
}

/* =========================================================
   Event badge
   ========================================================= */
function EventBadge({ type }) {
  const styles = {
    NODE_START:    { bg: '#0D1D2A', color: '#5BA8D4', border: '#1D3A50' },
    NODE_END:      { bg: '#0D2A1A', color: '#4BAD7A', border: '#1D4030' },
    SCORE:         { bg: '#2A220A', color: '#C9A227', border: '#3D3210' },
    LOG:           { bg: '#1A1B1F', color: '#8E9096', border: '#2C2F35' },
    STATUS_CHANGE: { bg: '#0D2028', color: '#2BA88C', border: '#1A3A30' },
    LOOP_BACK:     { bg: '#1A1000', color: '#F59E0B', border: '#3D2800' },
    DONE:          { bg: '#0A1F12', color: '#22C55E', border: '#1A3A22' },
    ERROR:         { bg: '#1A0606', color: '#EF4444', border: '#3D1515' },
  };
  const s = styles[type] || styles.LOG;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: '3px',
      backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: '600',
      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

/* =========================================================
   Main SwarmVisualizer
   ========================================================= */
export default function SwarmVisualizer({ status, loopCount, events = [] }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getAgentStepStatus = (agentName) => {
    const hasStarted  = events.some(e => e.agent === agentName && e.event_type === 'NODE_START');
    const hasFinished = events.some(e => e.agent === agentName && e.event_type === 'NODE_END');
    if (hasFinished) return 'completed';
    if (hasStarted)  return 'active';
    return 'pending';
  };

  const researcherStatus = getAgentStepStatus('researcher');
  const analystStatus    = getAgentStepStatus('analyst');
  const criticStatus     = getAgentStepStatus('critic');

  const progressPct =
    status === 'COMPLETED' || status === 'COMPLETED_WITH_WARNING' ? 100 :
    status === 'RUNNING' ? Math.min(90, 20 + loopCount * 28) :
    0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ======================================================
          Orchestration Panel
          ====================================================== */}
      <div className="panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>
                Swarm Orchestration
              </h3>
              {status === 'RUNNING' && (
                <span
                  style={{
                    display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: 'var(--color-accent-teal)',
                    animation: 'sonar 1.6s ease-out 1',
                  }}
                />
              )}
            </div>
            <span className="mono-label">Instrument panel · Agent pipeline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span className="mono-label">Revision loop</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {loopCount}<span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '400' }}> / 3</span>
            </span>
          </div>
        </div>

        {/* Instrument Diagram */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <InstrumentDiagram
            researcherStatus={researcherStatus}
            analystStatus={analystStatus}
            criticStatus={criticStatus}
            status={status}
          />
        </div>

        {/* Progress bar */}
        {(status === 'RUNNING' || status === 'QUEUED') && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="mono-label">Execution progress</span>
              <span className="mono-label">{progressPct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          Agent Status Cards
          ====================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { key: 'researcher', label: 'Researcher', role: 'Web Search & RAG Indexing', st: researcherStatus, model: 'Tavily + Qdrant' },
          { key: 'analyst',    label: 'Analyst',    role: 'Report Synthesis',          st: analystStatus,    model: 'Groq / OpenRouter' },
          { key: 'critic',     label: 'Critic',     role: 'Multi-Tier Peer Review',    st: criticStatus,     model: 'Parallel Council' },
        ].map(ag => (
          <div
            key={ag.key}
            className="panel"
            style={{
              padding: '16px',
              borderColor: ag.st === 'active' ? 'var(--color-accent-teal)' : ag.st === 'completed' ? 'var(--color-accent-teal-dim)' : 'var(--color-border)',
              transition: 'border-color 200ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: '600', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {ag.label}
              </span>
              <span
                className={`status-dot ${ag.st === 'active' ? 'running' : ag.st === 'completed' ? 'success' : 'queued'}`}
                style={ag.st === 'active' ? { animation: 'sonar 1.6s ease-out 1' } : {}}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.4 }}>
              {ag.role}
            </p>
            <span className="mono-label">{ag.model}</span>
          </div>
        ))}
      </div>

      {/* ======================================================
          Live Event Console
          ====================================================== */}
      <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Console header bar */}
        <div style={{
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#3D1515', display: 'inline-block' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#3D2800', display: 'inline-block' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#1A3A1A', display: 'inline-block' }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              SWARM EVENT STREAM
            </span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
            {events.length} events
          </span>
        </div>

        {/* Console body */}
        <div style={{ height: '240px', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {events.length === 0 ? (
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
              Awaiting event stream…
            </p>
          ) : (
            events.map((evt, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '4px 6px', borderRadius: '4px',
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-border)', minWidth: '24px', paddingTop: '1px' }}>
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <EventBadge type={evt.event_type} />
                {evt.agent && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--color-accent-teal)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    [{evt.agent}]
                  </span>
                )}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--color-text-secondary)', flex: 1, lineHeight: 1.5 }}>
                  {evt.message}
                </span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
