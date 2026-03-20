import { useState, useEffect } from 'react';

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    setImpersonating(localStorage.getItem('quoteme_impersonating'));
  }, []);

  if (!impersonating) return null;

  function stopImpersonating() {
    const adminToken = localStorage.getItem('quoteme_admin_token');
    if (adminToken) {
      localStorage.setItem('quoteme_token', adminToken);
      localStorage.removeItem('quoteme_admin_token');
    }
    localStorage.removeItem('quoteme_impersonating');
    window.location.href = '/qm-admin';
  }

  return (
    <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-3 relative z-50">
      <span>Viewing as {impersonating}</span>
      <button
        onClick={stopImpersonating}
        className="underline hover:no-underline font-semibold"
      >
        Stop Impersonating
      </button>
    </div>
  );
}
