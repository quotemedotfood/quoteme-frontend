import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, Check, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { confirmDistributor, updateDistributorName } from '../services/api';

export function OnboardingConfirmPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const distributorName = user?.distributor?.name || user?.distributor_name || '';

  // Load fonts
  useEffect(() => {
    if (!document.getElementById('quoteme-fonts')) {
      const link = document.createElement('link');
      link.id = 'quoteme-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    const res = await confirmDistributor();
    if (res.error) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    await refreshUser();
    navigate('/dashboard');
  };

  const handleStartEdit = () => {
    setEditName(distributorName);
    setEditing(true);
    setError('');
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    const res = await updateDistributorName(editName.trim());
    if (res.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    await refreshUser();
    setEditing(false);
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#FFF9F3] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#A5CFDD] mb-3 text-center"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Confirm Your Distributor Workspace
        </h1>

        <p
          className="text-sm text-gray-500 text-center mb-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          This workspace will contain your catalog, reps, quotes, and restaurants.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          {!editing ? (
            <>
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Distributor
                </p>
                <p
                  className="text-xl font-semibold text-[#2A2A2A]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {distributorName || 'Not set'}
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex-1 bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
                >
                  {confirming ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Confirm and Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  className="border-gray-300 text-[#2A2A2A]"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Distributor Name
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Distributor Name
                </p>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter distributor name"
                  className="text-lg"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="flex-1 bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="border-gray-300 text-[#2A2A2A]"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
