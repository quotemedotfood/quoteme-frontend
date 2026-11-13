// PAIRME on the QM admin restaurant page.
//
// Moose, 2026-09-24: the pairings are "saved in the metropolis restaurant page
// in QuoteMe admin", and the pronunciation is "stored with the wines".
// Moose, 2026-10-02: "we need a better view of the pairings": two tabs.
//   BY DISH: one row per dish, course tabs, search, the wines side by side.
//   BY WINE: one row per wine on the list, what it is paired with, and the
//            wines that are never paired.
// Reads GET /api/v1/admin/restaurants/:id/pairme (QM admin only), or, on the
// restaurant admin's home, the same payload from their own scoped read
// (`load`), which also carries pairings_updated_at (Moose, 2026-10-13: "show
// the pairings that the qmadmin can see to the restaurant admin").
//
// Rules this section keeps:
//  - JOIN ON ID. A pairing leg names a wine_id; the wine is looked up by that
//    id. Two of Metropolis's wines print "Sauvignon Blanc".
//  - NOTHING CROWNED. No rank, number, badge or "top" label on any leg; the
//    wines sit side by side in authored order, unnumbered.
//  - NEVER A BARE PRICE. Every priced line names the wine, the producer, the
//    printed list, the unit and the price.
//  - A drafted pronunciation says it is drafted.
//
// PAIR THIS COURSE (Moose, 2026-11-12, Chef Zorba's: wine only on the lunch
// and dinner sections). When the read carries `courses`, each course chip
// has a "Pair this course" switch. Off courses are dimmed with a small "Not
// paired" label; their dishes (still sent to the QM admin, never to the
// restaurant admin) are dimmed and left out of every count. The switch
// writes through `setCourse` (QM admin: PATCH /api/v1/admin/restaurants/:id/
// pairme_courses; restaurant admin: their own scoped PATCH), then reloads.
// A dish belongs to the course whose server-sent `labels` hold its course;
// nothing here normalises a name.
import { useEffect, useMemo, useState } from 'react';
import {
  getAdminRestaurantPairme,
  setAdminPairmeCourse,
  AdminRestaurantPairme,
  AdminPairmeWine,
  AdminPairmeDish,
  type AdminPairmeCourse,
  type ApiResponse,
} from '../../services/adminApi';

type SetCourse = (id: string, course: string, paired: boolean) => Promise<ApiResponse<{ courses: AdminPairmeCourse[] }>>;

type PairmeData = AdminRestaurantPairme & { pairings_updated_at?: string | null };

const LIST_LABEL: Record<string, string> = {
  wine_list: 'Wine list',
  dessert_wine: 'Dessert wines',
  port_cognac: 'Port & cognac',
};

const SAY_LABEL: Record<string, string> = {
  authored: 'written by the wine team',
  drafted: 'drafted, not yet reviewed',
  grape_fallback: 'grape only, no wine name yet',
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function priceLine(w: AdminPairmeWine) {
  const parts: string[] = [];
  if (w.glass_cents != null) parts.push(`${dollars(w.glass_cents)} glass`);
  if (w.bottle_cents != null) parts.push(`${dollars(w.bottle_cents)} bottle`);
  return parts.length ? parts.join(' · ') : 'No price printed';
}

function wineName(w: AdminPairmeWine) {
  return [w.producer, w.wine_name].filter(Boolean).join(', ');
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase();

type Tab = 'dish' | 'wine';
type WineFilter = 'all' | 'paired' | 'never';

const tabBtn = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`;

export function PairmeSection({
  restaurantId,
  load = getAdminRestaurantPairme,
  setCourse,
  title = 'PairMe',
}: {
  restaurantId: string;
  load?: (id: string) => Promise<ApiResponse<PairmeData>>;
  /** Defaults to the QM admin's PATCH; read only when a switch is clicked. */
  setCourse?: SetCourse;
  title?: string;
}) {
  const [data, setData] = useState<PairmeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dish');
  const [course, setCourseTab] = useState<string>('all');
  const [wineFilter, setWineFilter] = useState<WineFilter>('all');
  const [q, setQ] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    load(restaurantId).then((res) => {
      if (!live) return;
      if (res.data) setData(res.data);
      else setError(res.error || 'Could not load PairMe data');
    });
    return () => {
      live = false;
    };
  }, [restaurantId, load, reload]);

  const wines = data?.wines ?? [];
  const dishes = data?.pairings ?? [];
  const serverCourses = data?.courses;
  const byId = useMemo(() => new Map(wines.map((w) => [w.wine_id, w])), [wines]);
  // Chips: the server's course list when sent (one per course, with its
  // switch), else each printed course as before.
  const courses = useMemo<AdminPairmeCourse[]>(() => {
    if (serverCourses) return serverCourses;
    const seen: string[] = [];
    for (const d of dishes) if (d.course && !seen.includes(d.course)) seen.push(d.course);
    return seen.map((c) => ({ course: c, key: c, labels: [c], paired: true, dishes: 0 }));
  }, [dishes, serverCourses]);
  const courseOf = (d: AdminPairmeDish) => (d.course ? courses.find((c) => c.labels.includes(d.course!)) : undefined);
  const isOff = (d: AdminPairmeDish) => courseOf(d)?.paired === false;
  // Dishes in courses that are on: every count reads these.
  const onDishes = dishes.filter((d) => !isOff(d));
  // Every dish each wine is paired with, BY wine_id, never by its label.
  const dishesByWine = useMemo(() => {
    const m = new Map<string, AdminPairmeDish[]>();
    for (const d of onDishes) for (const leg of d.pairings) {
      if (!m.has(leg.wine_id)) m.set(leg.wine_id, []);
      if (!m.get(leg.wine_id)!.includes(d)) m.get(leg.wine_id)!.push(d);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishes, courses]);

  const flip = async (c: AdminPairmeCourse) => {
    setSwitching(c.key);
    setSwitchError(null);
    const write = setCourse ?? ((id: string, course: string, paired: boolean) => setAdminPairmeCourse(id, course, paired));
    const res = await write(restaurantId, c.course, !c.paired);
    setSwitching(null);
    if (res.data) {
      setData((prev) => (prev ? { ...prev, courses: res.data!.courses } : prev));
      setReload((n) => n + 1);
    } else {
      setSwitchError(res.error || 'Could not change this course');
    }
  };

  const heading = (
    <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
      {title}
    </h2>
  );

  if (error) {
    return (
      <section className="mb-8" data-testid="pairme-section">
        {heading}
        <p className="text-sm text-red-500">{error}</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="mb-8" data-testid="pairme-section">
        {heading}
        <p className="text-sm text-gray-400">Loading…</p>
      </section>
    );
  }
  if (!data.venue) {
    return (
      <section className="mb-8" data-testid="pairme-section">
        {heading}
        <p className="text-sm text-gray-400">No PairMe wine list or pairings loaded for this restaurant.</p>
      </section>
    );
  }

  const query = norm(q.trim());
  const wineMatches = (w: AdminPairmeWine | undefined) =>
    !!w && (norm(w.producer).includes(query) || norm(w.wine_name).includes(query));
  const shownDishes = dishes.filter((d) =>
    (course === 'all' || courseOf(d)?.key === course) &&
    (!query || norm(d.name).includes(query) || d.pairings.some((l) => wineMatches(byId.get(l.wine_id)))));
  const fewer = onDishes.filter((d) => d.pairings.length > 0 && d.pairings.length < 3).length;
  const none = onDishes.filter((d) => d.pairings.length === 0).length;
  const coursesOff = courses.filter((c) => !c.paired).length;
  const neverPaired = wines.filter((w) => !dishesByWine.has(w.wine_id)).length;
  const shownWines = wines.filter((w) => {
    const paired = dishesByWine.has(w.wine_id);
    if (wineFilter === 'paired' && !paired) return false;
    if (wineFilter === 'never' && paired) return false;
    return !query || wineMatches(w) || (dishesByWine.get(w.wine_id) || []).some((d) => norm(d.name).includes(query));
  });

  return (
    <section className="mb-8" data-testid="pairme-section">
      {heading}
      {data.pairings_updated_at ? (
        <p className="text-sm text-[#4F4F4F] mb-1" data-testid="pairme-updated-at">
          Last updated {new Date(data.pairings_updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      ) : null}
      <p className="text-sm text-gray-500 mb-4" data-testid="pairme-summary">
        {wines.length} wines · {onDishes.length} dishes paired
        {fewer ? ` · ${fewer} with fewer than three wines` : ''}
        {none ? ` · ${none} with none` : ''}
        {` · ${neverPaired} ${neverPaired === 1 ? 'wine' : 'wines'} never paired`}
        {coursesOff ? ` · ${coursesOff} ${coursesOff === 1 ? 'course' : 'courses'} not paired` : ''}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div role="tablist" aria-label="Pairings view" className="flex gap-2">
          <button type="button" role="tab" aria-selected={tab === 'dish'} className={tabBtn(tab === 'dish')} onClick={() => setTab('dish')}>By dish</button>
          <button type="button" role="tab" aria-selected={tab === 'wine'} className={tabBtn(tab === 'wine')} onClick={() => setTab('wine')}>By wine</button>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'dish' ? 'Search dishes or wines' : 'Search wines or dishes'}
          aria-label="Search pairings"
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 max-w-full"
        />
      </div>

      {tab === 'dish' ? (
        <>
          {serverCourses && courses.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3" aria-label="Courses">
              <button type="button" className={tabBtn(course === 'all')} onClick={() => setCourseTab('all')}>
                All courses
              </button>
              {courses.map((c) => (
                <span
                  key={c.key}
                  data-testid="pairme-course-chip"
                  data-paired={c.paired ? 'yes' : 'no'}
                  className={`inline-flex items-center gap-1.5 ${c.paired ? '' : 'opacity-50'}`}
                >
                  <button type="button" className={tabBtn(course === c.key)} onClick={() => setCourseTab(c.key)}>
                    {c.course}
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.paired}
                    aria-label={`Pair this course: ${c.course}`}
                    title="Pair this course"
                    disabled={switching !== null}
                    onClick={() => flip(c)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors disabled:cursor-wait ${c.paired ? 'bg-[#2A2A2A] border-[#2A2A2A]' : 'bg-gray-200 border-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${c.paired ? 'left-[1.1rem]' : 'left-0.5'}`} />
                  </button>
                  {c.paired ? null : <span className="text-xs text-gray-500" data-testid="pairme-course-not-paired">Not paired</span>}
                </span>
              ))}
            </div>
          ) : courses.length > 1 ? (
            <div className="flex flex-wrap gap-2 mb-3" aria-label="Courses">
              {['all', ...courses.map((c) => c.key)].map((c) => (
                <button key={c} type="button" className={tabBtn(course === c)} onClick={() => setCourseTab(c)}>
                  {c === 'all' ? 'All courses' : c}
                </button>
              ))}
            </div>
          ) : null}
          {switchError ? <p className="text-sm text-red-500 mb-2">{switchError}</p> : null}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm" data-testid="pairme-dish-table">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium w-56">Dish</th>
                  <th className="px-4 py-2 font-medium" colSpan={3}>Wines</th>
                </tr>
              </thead>
              <tbody>
                {shownDishes.map((d) => (
                  <tr
                    key={d.dish_id}
                    className={`align-top border-b border-gray-100 last:border-0 ${isOff(d) ? 'opacity-50' : ''}`}
                    data-testid="pairme-dish"
                    data-paired={isOff(d) ? 'no' : 'yes'}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#2A2A2A]">{d.name}</p>
                      {d.course ? <p className="text-xs text-gray-400">{d.course}</p> : null}
                      {isOff(d) ? <p className="text-xs text-gray-500 mt-1">Not paired: this course is switched off</p> : null}
                      {!isOff(d) && d.pairings.length < 3 ? (
                        <p className="text-xs text-amber-700 mt-1">
                          {d.pairings.length === 0 ? 'No wine paired' : `${d.pairings.length === 1 ? 'One wine' : 'Two wines'}, not three`}
                        </p>
                      ) : null}
                    </td>
                    {d.pairings.map((leg) => {
                      const w = byId.get(leg.wine_id);
                      if (!w) {
                        return (
                          <td key={leg.wine_id} className="px-4 py-3 text-xs text-red-500 min-w-[12rem]">
                            {leg.wine_id} is not on this restaurant's list
                          </td>
                        );
                      }
                      return (
                        <td key={leg.wine_id} className="px-4 py-3 min-w-[12rem]" data-testid="pairme-leg">
                          <p className="text-[#2A2A2A]">{wineName(w)}</p>
                          <p className="text-xs text-gray-500">
                            {LIST_LABEL[w.list_source ?? ''] ?? 'Wine list'} · {priceLine(w)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{leg.why}</p>
                        </td>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 3 - d.pairings.length) }).map((_, i) => (
                      <td key={`empty-${i}`} className="px-4 py-3 min-w-[12rem]" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {shownDishes.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No dish matches.</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3" aria-label="Which wines">
            {([['all', 'All wines'], ['paired', 'Paired'], ['never', 'Never paired']] as [WineFilter, string][]).map(([k, label]) => (
              <button key={k} type="button" className={tabBtn(wineFilter === k)} onClick={() => setWineFilter(k)}>{label}</button>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm" data-testid="pairme-wine-table">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Wine</th>
                  <th className="px-4 py-2 font-medium">List and price</th>
                  <th className="px-4 py-2 font-medium">How to say it</th>
                  <th className="px-4 py-2 font-medium">Paired with</th>
                </tr>
              </thead>
              <tbody>
                {shownWines.map((w) => {
                  const paired = dishesByWine.get(w.wine_id) || [];
                  return (
                    <tr key={w.wine_id} className="align-top border-b border-gray-100 last:border-0" data-testid="pairme-wine">
                      <td className="px-4 py-3 text-[#2A2A2A]">
                        {wineName(w)}
                        {w.vintage ? <span className="text-gray-400"> {w.vintage}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {LIST_LABEL[w.list_source ?? ''] ?? 'Wine list'} · {priceLine(w)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {w.say ? (
                          <span>
                            {w.say}
                            {w.say_source ? <span className="text-gray-400"> ({SAY_LABEL[w.say_source]})</span> : null}
                          </span>
                        ) : (
                          <span className="text-gray-400">No pronunciation yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" data-testid="pairme-wine-dishes">
                        {paired.length ? (
                          <span className="text-gray-700">{paired.map((d) => d.name).join(', ')} ({paired.length})</span>
                        ) : (
                          <span className="text-amber-700">Never paired</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shownWines.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No wine matches.</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
