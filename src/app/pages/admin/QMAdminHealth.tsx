import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getAdminHealth, HealthCheck } from '../../services/adminApi';

const STATUS_ICON = {
  ok: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
};

const STATUS_BG = {
  ok: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
};

const STATUS_TEXT = {
  ok: 'text-green-700',
  warning: 'text-yellow-700',
  error: 'text-red-700',
};

export function QMAdminHealth() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHealth() {
    setLoading(true);
    setError(null);
    const res = await getAdminHealth();
    if (res.data) setHealth(res.data);
    else setError(res.error || 'Failed to check health');
    setLoading(false);
  }

  useEffect(() => { loadHealth(); }, []);

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
          {health && (
            <p className="text-sm text-[#4F4F4F] mt-1">
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={loadHealth}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <div className={`rounded-xl border-2 px-5 py-4 mb-6 ${health.overall === 'healthy' ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
          <div className="flex items-center gap-3">
            {health.overall === 'healthy' ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            )}
            <div>
              <p className="font-semibold text-[#2A2A2A]">
                {health.overall === 'healthy' ? 'All Systems Operational' : 'Some Services Degraded'}
              </p>
              <p className="text-sm text-[#4F4F4F]">
                {Object.values(health.services).filter(s => s.status === 'ok').length} of {Object.values(health.services).length} services operational
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading && !health && <p className="text-sm text-gray-400 py-8">Checking services...</p>}

      {health && (
        <div className="space-y-3">
          {Object.entries(health.services).map(([key, service]) => (
            <div
              key={key}
              className={`flex items-center gap-4 rounded-lg border px-5 py-4 ${STATUS_BG[service.status]}`}
            >
              {STATUS_ICON[service.status]}
              <div className="flex-1">
                <p className="font-medium text-[#2A2A2A]">{service.name}</p>
                <p className={`text-sm ${STATUS_TEXT[service.status]}`}>{service.message}</p>
              </div>
              <span className={`text-xs font-medium uppercase ${STATUS_TEXT[service.status]}`}>
                {service.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
