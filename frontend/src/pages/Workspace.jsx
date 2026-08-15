import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { researchAPI } from '../services/api';
import SwarmVisualizer from '../components/SwarmVisualizer';
import ReportRenderer from '../components/ReportRenderer';
import { ArrowLeft, RefreshCw, FileText, Activity, RotateCcw } from 'lucide-react';

function StatusIndicator({ status }) {
  const map = {
    COMPLETED:              { dot: 'success', label: 'Completed' },
    COMPLETED_WITH_WARNING: { dot: 'warning', label: 'Completed w/ Warning' },
    RUNNING:                { dot: 'running', label: 'Running' },
    QUEUED:                 { dot: 'queued',  label: 'Queued' },
    FAILED:                 { dot: 'error',   label: 'Failed' },
  };
  const conf = map[status] || { dot: 'queued', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className={`status-dot ${conf.dot}`} />
      <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-secondary)' }}>
        {conf.label}
      </span>
    </span>
  );
}

export default function Workspace() {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const [jobData,    setJobData]    = useState(null);
  const [report,     setReport]     = useState(null);
  const [activeTab,  setActiveTab]  = useState('visualizer');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const fetchJobStatus = async () => {
    try {
      const res  = await researchAPI.getStatus(jobId);
      const data = res.data;
      setJobData(data);

      if (data.report) {
        setReport(data.report);
      } else if (['COMPLETED', 'COMPLETED_WITH_WARNING', 'completed', 'completed_with_warning'].includes(data.status)) {
        try {
          const reportRes = await researchAPI.getReport(jobId);
          setReport(reportRes.data);
        } catch (repErr) {
          console.error('Report fetch error:', repErr);
        }
      }
    } catch (err) {
      console.error('Status poll error:', err);
      setError('Failed to load workspace. The job may not exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      await researchAPI.retryJob(jobId);
      setReport(null);
      setActiveTab('visualizer');
      fetchJobStatus();
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  useEffect(() => {
    fetchJobStatus();
    const interval = setInterval(() => {
      if (!jobData || ['QUEUED', 'RUNNING', 'pending'].includes(jobData.status)) {
        fetchJobStatus();
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, jobData?.status]);

  /* Loading */
  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <RefreshCw size={20} style={{ color: 'var(--color-accent-teal)', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          BOOTSTRAPPING WORKSPACE…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div style={{ maxWidth: '480px', margin: '64px auto', padding: '32px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid #3D1515', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '16px' }}>{error}</p>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-accent-teal)', textDecoration: 'none' }}>
          <ArrowLeft size={13} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const canRetry = ['FAILED', 'failed', 'COMPLETED_WITH_WARNING', 'completed_with_warning'].includes(jobData?.status);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ================================================================
          Top navigation bar
          ================================================================ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left — back + retry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/dashboard"
            id="back-to-dashboard-btn"
            className="btn-secondary"
            style={{ textDecoration: 'none', fontSize: '12px' }}
          >
            <ArrowLeft size={13} />
            <span>Dashboard</span>
          </Link>

          {canRetry && (
            <button
              id="workspace-retry-btn"
              onClick={handleRetry}
              className="btn-warning"
              title="Restart Research Swarm"
            >
              <RotateCcw size={12} />
              <span>Retry Execution</span>
            </button>
          )}
        </div>

        {/* Center — job topic + status */}
        <div style={{ flex: 1, textAlign: 'center', maxWidth: '500px', margin: '0 auto', overflow: 'hidden' }}>
          {jobData && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {jobData.topic}
              </span>
              <StatusIndicator status={jobData.status} />
            </div>
          )}
        </div>

        {/* Right — tab selector */}
        <div style={{
          display: 'flex', alignItems: 'center',
          backgroundColor: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '3px', gap: '2px',
        }}>
          <button
            id="tab-visualizer-btn"
            onClick={() => setActiveTab('visualizer')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500',
              backgroundColor: activeTab === 'visualizer' ? 'var(--color-surface-elevated)' : 'transparent',
              color: activeTab === 'visualizer' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              transition: 'all 150ms ease',
            }}
          >
            <Activity size={12} style={{ color: activeTab === 'visualizer' ? 'var(--color-accent-teal)' : 'inherit' }} />
            <span>Swarm Console</span>
          </button>

          <button
            id="tab-report-btn"
            onClick={() => setActiveTab('report')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500',
              backgroundColor: activeTab === 'report' ? 'var(--color-surface-elevated)' : 'transparent',
              color: activeTab === 'report' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              transition: 'all 150ms ease',
            }}
          >
            <FileText size={12} style={{ color: activeTab === 'report' ? 'var(--color-accent-teal)' : 'inherit' }} />
            <span>Research Report</span>
            {report && (
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
            )}
          </button>
        </div>
      </div>

      {/* ================================================================
          Main content
          ================================================================ */}
      {activeTab === 'visualizer' ? (
        <SwarmVisualizer
          status={jobData?.status}
          loopCount={jobData?.loop_count || 0}
          events={jobData?.events || []}
        />
      ) : (
        <ReportRenderer report={report} topic={jobData?.topic} />
      )}
    </div>
  );
}
