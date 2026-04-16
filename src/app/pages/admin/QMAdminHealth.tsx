import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  getAdminHealth, HealthCheck,
  getAdminHealthHistory, HealthHistory, HealthHistoryEntry
} from '../../services/adminApi';

const STATUS_ICON: Record<string, JSX.Element> = {
  ok: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
};

const STATUS_BG: Record<string, string> = {
  ok: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
};

const STATUS_TEXT: Record<string, string> = {
  ok: 'text-green-700',
  warning: 'text-yellow-700',
  error: 'text-red-700',
};

const DOT_COLOR: Record<string, string> = {
  ok: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
};

const OVERALL_CONFIG: Record<string, { bg: string; icon: JSX.Element; label: string }> = {
  healthy: {
    bg: 'border-green-300 bg-green-50',
    icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
    label: 'All Systems Operational',
  },
  degraded: {
    bg: 'border-yellow-300 bg-yellow-50',
    icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    label: 'Some Services Degraded',
  },
  unhealthy: {
    bg: 'border-red-300 bg-red-50',
    icon: <XCircle className="w-6 h-6 text-red-500" />,
    label: 'Service Outage Detected',
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function HistoryDots({ history }: { history: HealthHistoryEntry[] }) {
  return (
    <div className="flex items-center gap-px mt-2 overflow-x-auto">
      {history.map((entry, i) => (
        <div
          key={i}
          className={`w-1.5 h-3 rounded-sm ${DOT_COLOR[entry.status]} cursor-default`}
          title={`${entry.status.toUpperCase()} — ${entry.message}\n${new Date(entry.checked_at).toLocaleString()}`}
        />
      ))}
    </div>
  );
}

export function QMAdminHealth() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [history, setHistory] = useState<HealthHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHealth() {
    setLoading(true);
    setError(null);
    const [healthRes, historyRes] = await Promise.all([
      getAdminHealth(),
      getAdminHealthHistory(),
    ]);
    if (healthRes.data) setHealth(healthRes.data);
    else setError(healthRes.error || 'Failed to check health');
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
    setSecondsAgo(0);
  }

  useEffect(() => {
    loadHealth();
    const refreshInterval = setInterval(loadHealth, 60000);
    timerRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => {
      clearInterval(refreshInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const overallKey = health?.overall || 'healthy';
  const overall = OVERALL_CONFIG[overallKey] || OVERALL_CONFIG.healthy;

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            System Health
          </h1>
          <p className="text-sm text-[#4F4F4F] mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {loading ? 'Checking...' : `Updated ${secondsAgo}s ago · auto-refreshes every 60s`}
          </p>
        </div>
        <Button onClick={loadHealth} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <div className={`rounded-xl border-2 px-5 py-4 mb-6 ${overall.bg}`}>
          <div className="flex items-center gap-3">
            {overall.icon}
            <div>
              <p className="font-semibold text-[#2A2A2A]">{overall.label}</p>
              <p className="text-sm text-[#4F4F4F]">
                {Object.values(health.services).filter(s => s.status === 'ok').length} of{' '}
                {Object.values(health.services).length} services operational
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      {loading && !health && <p className="text-sm text-gray-400 py-8">Checking services...</p>}

      {health && (
        <div className="space-y-3">
          {Object.entries(health.services).map(([key, service]) => {
            const serviceHistory = history?.services?.[key];
            return (
              <div
                key={key}
                className={`rounded-lg border px-5 py-4 ${STATUS_BG[service.status]}`}
              >
                <div className="flex items-center gap-4">
                  {STATUS_ICON[service.status]}
                  <div className="flex-1">
                    <p className="font-medium text-[#2A2A2A]">{service.name}</p>
                    <p className={`text-sm ${STATUS_TEXT[service.status]}`}>{service.message}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium uppercase ${STATUS_TEXT[service.status]}`}>
                      {service.status}
                    </span>
                    {serviceHistory?.last_incident && (
                      <p className="text-xs text-[#888] mt-0.5">
                        Last incident: {timeAgo(serviceHistory.last_incident)}
                      </p>
                    )}
                  </div>
                </div>
                {serviceHistory?.history && serviceHistory.history.length > 0 && (
                  <HistoryDots history={serviceHistory.history} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
