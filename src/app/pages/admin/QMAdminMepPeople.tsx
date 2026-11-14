// QM ADMIN: ONE MEP'S PEOPLE (MEP platform part B, Moose 2026-11-13).
// /qm-admin/meps/:id/people. Import Connections.csv for the MEP, add one
// person from a pasted LinkedIn URL (never fetched), confirm a suggested
// account, or add a missing company as a restaurant group. The star is the
// MEP's own and is shown, not changed, here.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PeopleList, PeopleApi } from '../../components/mep/PeopleList';
import {
  getAdminMepPeople,
  importAdminMepPeople,
  addAdminMepPerson,
  linkAdminMepPerson,
  unlinkAdminMepPerson,
  addGroupFromMepPerson,
} from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

const EMPTY = { linkedin_url: '', first_name: '', last_name: '', company: '', position: '' };

export function QMAdminMepPeople() {
  const { id = '' } = useParams();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [version, setVersion] = useState(0);

  const api: PeopleApi = useMemo(
    () => ({
      list: (q) => getAdminMepPeople(id, q),
      importText: (text) => importAdminMepPeople(id, text),
      link: linkAdminMepPerson,
      unlink: unlinkAdminMepPerson,
      addGroup: addGroupFromMepPerson,
    }),
    // version: a new object after a single add, so the list reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, version],
  );

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const res = await addAdminMepPerson(id, form);
    setSaving(false);
    if (res.data) {
      setMessage({ ok: true, text: 'Added.' });
      setForm(EMPTY);
      setVersion((v) => v + 1);
    } else {
      setMessage({ ok: false, text: res.error || 'Not added.' });
    }
  }

  const field = (key: keyof typeof EMPTY, label: string) => (
    <input
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      placeholder={label}
      aria-label={label}
      className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-0"
    />
  );

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <Link to="/qm-admin/meps" className="text-sm text-[#7FAEC2] hover:underline">MEPs</Link>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mt-1 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
        People
      </h1>

      <form onSubmit={addOne} className="bg-white border border-gray-200 rounded-xl p-4 mb-6" aria-label="Add one person">
        <p className="text-sm font-medium text-[#2A2A2A] mb-2">Add one person</p>
        <p className="text-xs text-gray-500 mb-3">Paste their LinkedIn address. We do not open or read LinkedIn.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {field('linkedin_url', 'LinkedIn URL')}
          {field('company', 'Company')}
          {field('first_name', 'First name')}
          {field('last_name', 'Last name')}
          {field('position', 'Title')}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            type="submit"
            disabled={saving || !form.linkedin_url.trim()}
            className="text-sm bg-[#A5CFDD] hover:bg-[#7FAEC2] disabled:opacity-50 text-white rounded-md px-3 py-1.5"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
          {message && (
            <span role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-500'}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <PeopleList api={api} />
      </div>
    </div>
  );
}
