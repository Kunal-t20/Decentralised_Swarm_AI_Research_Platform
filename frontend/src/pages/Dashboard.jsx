import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { researchAPI } from '../services/api';
import { Search, Trash2, ArrowUpRight, RotateCcw, RefreshCw } from 'lucide-react';

/* =========================================================
   Status indicator — dot + label, no chunky pills
   ========================================================= */
function StatusIndicator({ status }) {
  const map = {
    COMPLETED:             { dot: 'success', label: 'Completed' },
    COMPLETED_WITH_WARNING:{ dot: 'warning', label: 'Completed w/ Warning' },
    RUNNING:               { dot: 'running', label: 'Running' },
    QUEUED:                { dot: 'queued',  label: 'Queued' },
    FAILED:                { dot: 'error',   label: 'Failed' },
  };
  const conf = map[status] || { dot: 'queued', label: status };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        className={`status-dot ${conf.dot}`}
        style={conf.dot === 'running' ? { animation: 'sonar 1.6s ease-out 1' } : {}}
      />
      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
        {conf.label}
      </span>
    </span>
  );
}

/* =========================================================
   Agent-flow mini-pill (Researcher → Analyst → Critic)
   ========================================================= */
function AgentFlow() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-muted)' }}>
      <span>Researcher</span>
      <span style={{ color: 'var(--color-border)' }}>→</span>
      <span>Analyst</span>
      <span style={{ color: 'var(--color-border)' }}>→</span>
      <span>Critic</span>
    </span>
  );
}

/* =========================================================
   Metric item (hairline divider layout, not boxed cards)
   ========================================================= */
function MetricItem({ value, unit, label, color }) {
  return (
    <div className="metric-item" style={{ paddingTop: '0', paddingBottom: '0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2px' }}>
        <span style={{ fontSize: '22px', fontWeight: '600', color: color || 'var(--color-text-primary)', letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace" }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{unit}</span>
        )}
      </div>
      <span className="mono-label">{label}</span>
    </div>
  );
}

/* =========================================================
   Main Dashboard Component
   ========================================================= */
export default function Dashboard() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await researchAPI.listJobs();
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch research jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const timer = setInterval(fetchJobs, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleLaunchResearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await researchAPI.createJob(topic.trim());
      navigate(`/workspace/${res.data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to submit research job.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this research job?')) return;
    try {
      await researchAPI.deleteJob(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  const handleRetryJob = async (jobId, e) => {
    e.stopPropagation();
    try {
      await researchAPI.retryJob(jobId);
      navigate(`/workspace/${jobId}`);
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  const completedJobs = jobs.filter(j => ['COMPLETED', 'COMPLETED_WITH_WARNING'].includes(j.status));
  const runningJobs   = jobs.filter(j => ['RUNNING', 'QUEUED'].includes(j.status));

  // Suggestions
  const suggestions = [
    'AI Agent Architectures',
    'Multi-Agent Systems',
    'RAG Evaluation Methods',
    'LLM Cost Optimization',
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ================================================================
          HERO — Research Command Interface
          ================================================================ */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Blueprint dot-grid */}
        <div className="hero-grid" style={{ position: 'absolute', inset: 0, borderRadius: '14px' }} />
        {/* Teal wash */}
        <div className="hero-wash" style={{ position: 'absolute', inset: 0, borderRadius: '14px' }} />

        <div
          className="panel"
          style={{
            position: 'relative',
            padding: '36px 40px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Left — command input */}
          <div>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginBottom: '16px', padding: '4px 10px', border: '1px solid var(--color-accent-brass)', borderRadius: '6px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-accent-brass)', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: '600', letterSpacing: '0.12em', color: 'var(--color-accent-brass)', textTransform: 'uppercase' }}>
                Autonomous Research Swarm
              </span>
            </div>

            {/* Heading — the ONE serif moment */}
            <h1
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontWeight: '600',
                fontSize: '32px',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: 'var(--color-text-primary)',
                margin: '0 0 10px',
              }}
            >
              Launch a Research Swarm
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 28px', maxWidth: '520px', lineHeight: 1.6 }}>
              Deploy specialized agents to search, analyze, verify, and synthesize your research query.
            </p>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#1A0606', border: '1px solid #3D1515', fontSize: '12px', color: '#F87171' }}>
                {error}
              </div>
            )}

            {/* Search input + launch */}
            <form onSubmit={handleLaunchResearch} style={{ display: 'flex', gap: '10px', maxWidth: '580px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={15}
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}
                />
                <input
                  id="research-topic-input"
                  type="text"
                  required
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="What do you want the research swarm to investigate?"
                  className="field"
                  style={{ paddingRight: '44px' }}
                />
                <span
                  style={{
                    position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)', borderRadius: '4px',
                    padding: '2px 5px', lineHeight: 1,
                  }}
                >
                  /
                </span>
              </div>
              <button
                id="submit-research-btn"
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ flexShrink: 0 }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Initializing…</span>
                  </>
                ) : (
                  <span>Launch Swarm</span>
                )}
              </button>
            </form>

            {/* Quick suggestion chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => setTopic(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Right — instrument panel agent diagram */}
          <AgentInstrumentPanel runningCount={runningJobs.length} />
        </div>
      </section>

      {/* ================================================================
          METRICS ROW — hairline divider layout
          ================================================================ */}
      <section
        className="panel"
        style={{ padding: '20px 0', display: 'flex', alignItems: 'center' }}
      >
        <MetricItem
          value={3}
          label="Active Agents"
        />
        <MetricItem
          value={jobs.length}
          label="Research Runs"
          color="var(--color-text-primary)"
        />
        <MetricItem
          value={completedJobs.length}
          label="Completed"
          color="var(--color-success)"
        />
        <MetricItem
          value={runningJobs.length}
          label="In Progress"
          color="var(--color-accent-teal)"
        />
      </section>

      {/* ================================================================
          RESEARCH ACTIVITY LEDGER
          ================================================================ */}
      <section className="panel" style={{ overflow: 'hidden' }}>
        {/* Section header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Research Activity
            </h2>
            <p className="mono-label" style={{ marginTop: '3px' }}>Monitor autonomous research executions</p>
          </div>
          <button
            onClick={fetchJobs}
            className="btn-secondary"
            style={{ flexShrink: 0, marginTop: '2px' }}
            title="Refresh"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-border-subtle)', margin: '16px 0 0' }} />

        {/* Table */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Loading research executions…
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>
              No research executions found. Launch your first query above.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Research Topic', 'Status', 'Agent Flow', 'Revisions', 'Created', 'Actions'].map((col, i) => (
                    <th
                      key={col}
                      className="mono-label"
                      style={{
                        padding: '10px 20px',
                        textAlign: i === 5 ? 'right' : 'left',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => {
                  const isRunning = ['RUNNING', 'QUEUED'].includes(job.status);
                  const canRetry  = ['FAILED', 'COMPLETED_WITH_WARNING', 'failed', 'completed_with_warning'].includes(job.status);
                  const progress  = job.status === 'COMPLETED' ? 100
                                  : job.status === 'COMPLETED_WITH_WARNING' ? 100
                                  : job.status === 'RUNNING' ? Math.min(90, 20 + job.loop_count * 30)
                                  : 0;

                  return (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: idx < jobs.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                        transition: 'background-color 150ms ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => navigate(`/workspace/${job.id}`)}
                    >
                      {/* Topic */}
                      <td style={{ padding: '14px 20px', maxWidth: '260px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.topic}
                        </span>
                        {isRunning && (
                          <div className="progress-track" style={{ marginTop: '6px' }}>
                            <div
                              className="progress-fill"
                              style={{ width: `${progress}%`, transition: 'width 800ms ease' }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <StatusIndicator status={job.status} />
                      </td>

                      {/* Agent flow */}
                      <td style={{ padding: '14px 20px' }}>
                        <AgentFlow />
                      </td>

                      {/* Loop count */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {job.loop_count} <span style={{ color: 'var(--color-border)' }}>/</span> 3
                        </span>
                      </td>

                      {/* Created */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {new Date(job.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <Link
                            to={`/workspace/${job.id}`}
                            id={`view-job-btn-${job.id}`}
                            className="btn-secondary"
                            style={{ textDecoration: 'none', fontSize: '11px' }}
                          >
                            <span>Open Workspace</span>
                            <ArrowUpRight size={11} />
                          </Link>

                          {canRetry && (
                            <button
                              id={`retry-job-btn-${job.id}`}
                              onClick={e => handleRetryJob(job.id, e)}
                              className="btn-warning"
                              title="Retry Research Swarm"
                            >
                              <RotateCcw size={11} />
                              <span>Retry</span>
                            </button>
                          )}

                          <button
                            id={`delete-job-btn-${job.id}`}
                            onClick={e => handleDeleteJob(job.id, e)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--color-text-muted)', padding: '4px',
                              borderRadius: '6px', display: 'flex', alignItems: 'center',
                              transition: 'color 150ms ease',
                            }}
                            title="Delete Job"
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {jobs.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border-subtle)' }}>
            <span className="mono-label">{jobs.length} total executions recorded</span>
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   Agent Instrument Panel (blueprint style, right side of hero)
   ========================================================= */
function AgentInstrumentPanel({ runningCount }) {
  const agents = [
    { id: 'researcher', label: 'Researcher', role: 'Web Search & RAG' },
    { id: 'analyst',    label: 'Analyst',    role: 'Report Synthesis' },
    { id: 'critic',     label: 'Critic',     role: 'Peer Evaluation' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
        minWidth: '200px',
        userSelect: 'none',
      }}
    >
      {/* Goal node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
        <div
          style={{
            padding: '5px 14px',
            border: '1.25px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'var(--color-surface-secondary)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Research Goal
        </div>
        {/* Vertical line down */}
        <div style={{ width: '1.25px', height: '16px', backgroundColor: 'var(--color-border)' }} />
      </div>

      {/* Agent ports row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {agents.map((agent, i) => (
          <div key={agent.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            {/* Connector from top */}
            <div style={{ width: '1.25px', height: '16px', backgroundColor: 'var(--color-border)' }} />

            {/* Hexagonal port */}
            <div
              style={{
                width: '46px',
                height: '46px',
                clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1.25px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--color-accent-teal)', fontWeight: '600' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Label */}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {agent.label}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'var(--color-border)', letterSpacing: '0.04em', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {agent.role}
            </span>

            {/* Connector down */}
            <div style={{ width: '1.25px', height: '16px', backgroundColor: 'var(--color-border)' }} />
          </div>
        ))}
      </div>

      {/* Synthesizer node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0' }}>
        <div
          style={{
            padding: '5px 14px',
            border: '1.25px solid var(--color-accent-teal)',
            borderRadius: '4px',
            backgroundColor: 'var(--color-accent-teal-faint)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: 'var(--color-accent-teal)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Synthesizer
        </div>
      </div>

      {/* Status indicator */}
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="status-dot" style={{ backgroundColor: runningCount > 0 ? 'var(--color-accent-teal)' : 'var(--color-text-muted)', width: '5px', height: '5px' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {runningCount > 0 ? `${runningCount} active` : 'Standby'}
        </span>
      </div>
    </div>
  );
}
