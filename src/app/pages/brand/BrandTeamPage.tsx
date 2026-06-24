import React, { useEffect, useRef, useState } from "react";
import {
  getBrandTeam,
  inviteBrandTeamMember,
  disableBrandTeamMember,
  BrandTeamMember,
} from "../../services/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? "#d1fae5" : "#f3f4f6",
        color: isActive ? "#065f46" : "#6b7280",
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface InviteModalProps {
  onClose: () => void;
  onInvited: (member: BrandTeamMember) => void;
}

function InviteModal({ onClose, onInvited }: InviteModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const member = await inviteBrandTeamMember({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      onInvited(member);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 440,
          padding: 32,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h2
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 20,
            color: "#111",
            marginBottom: 4,
          }}
        >
          Invite a teammate
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
          They'll receive an email to set their password and join your brand account.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                First name
              </label>
              <input
                ref={firstRef}
                style={inputStyle}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="First"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                Last name
              </label>
              <input
                style={inputStyle}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Last"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Work email
            </label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 16 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontSize: 14,
                cursor: "pointer",
                color: "#374151",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim()}
              style={{
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                background: busy ? "#f97316aa" : "#f97316",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Inviting…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BrandTeamPage() {
  const [members, setMembers] = useState<BrandTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [disabling, setDisabling] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getBrandTeam();
      setMembers(data);
    } catch {
      setError("Could not load team. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  function handleInvited(member: BrandTeamMember) {
    setMembers(prev => [...prev, member]);
    setShowInvite(false);
  }

  async function handleDisable(id: string) {
    if (!window.confirm("Disable this team member? They will lose access immediately.")) return;
    setDisabling(id);
    try {
      const updated = await disableBrandTeamMember(id);
      setMembers(prev => prev.map(m => m.id === id ? updated : m));
    } catch {
      alert("Could not disable team member. Please try again.");
    } finally {
      setDisabling(null);
    }
  }

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 700,
              fontSize: 26,
              color: "#111",
              marginBottom: 4,
            }}
          >
            Team
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Manage who has access to your brand account.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          style={{
            padding: "9px 20px",
            borderRadius: 6,
            border: "none",
            background: "#f97316",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Invite teammate
        </button>
      </div>

      {/* States */}
      {loading && (
        <p style={{ fontSize: 14, color: "#9ca3af" }}>Loading team…</p>
      )}

      {error && !loading && (
        <p style={{ fontSize: 14, color: "#dc2626" }}>{error}</p>
      )}

      {!loading && !error && members.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          No teammates yet — invite someone to help manage your brand.
        </div>
      )}

      {/* Table */}
      {!loading && !error && members.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Name", "Email", "Status", "Role", "Joined", "Last Active", ""].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr
                  key={member.id}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <td style={{ padding: "12px 12px", fontWeight: 500, color: "#111", whiteSpace: "nowrap" }}>
                    {member.first_name} {member.last_name}
                  </td>
                  <td style={{ padding: "12px 12px", color: "#374151" }}>
                    {member.email}
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    <StatusBadge status={member.status} />
                  </td>
                  <td style={{ padding: "12px 12px", color: "#374151", textTransform: "capitalize" }}>
                    {member.role.replace(/_/g, " ")}
                  </td>
                  <td style={{ padding: "12px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {formatDate(member.joined_at)}
                  </td>
                  <td style={{ padding: "12px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {formatDate(member.last_active_at)}
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "right" }}>
                    {member.status === "active" && (
                      <button
                        onClick={() => handleDisable(member.id)}
                        disabled={disabling === member.id}
                        style={{
                          fontSize: 12,
                          color: "#dc2626",
                          background: "none",
                          border: "1px solid #fecaca",
                          borderRadius: 4,
                          padding: "4px 10px",
                          cursor: disabling === member.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {disabling === member.id ? "Disabling…" : "Disable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={handleInvited}
        />
      )}
    </div>
  );
}
