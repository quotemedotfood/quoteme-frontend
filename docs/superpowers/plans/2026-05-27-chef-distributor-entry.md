# ChefDistributorEntryPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `ChefDistributorEntryPage` at `/chef/distributor/new` with three segmented-tab modes (Pick, Upload, Request) and wire the [+] Build Quote buttons to navigate there.

**Architecture:** New page component at `src/app/pages/chef/ChefDistributorEntryPage.tsx` following FE page conventions. Route added inside `ChefShellLayout` children block in `routes.tsx`. `createChefDistributor()` typed API function added to `api.ts`. Both [+] Build Quote buttons (desktop sidebar + mobile tab bar) retargeted to `'distributor-new'`; `ChefShellLayout.navTab` maps that to `/chef/distributor/new`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, lucide-react, react-router v6

---

### Task 1: Add `createChefDistributor` to api.ts

**Files:**
- Modify: `src/app/services/api.ts` (append at end)

- [ ] **Step 1: Add types and function**

Append to the end of `src/app/services/api.ts`:

```typescript
// ─── Chef distributor entry ────────────────────────────────────────────────

export interface ChefDistributorRepContact {
  existing_rep_id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChefDistributorCreateRequest {
  mode: 'pick' | 'upload' | 'request';
  distributor_id?: string;
  distributor_company_name?: string;
  rep_contact?: ChefDistributorRepContact;
  request_message?: string;
}

export interface ChefDistributorCreateResponse {
  distributor_id: string;
  catalog_id?: string;
  redirect_to: string;
  request_sent_to?: string;
}

/**
 * POST /api/v1/chef/distributors
 * mode "pick" / "request" → JSON body
 * mode "upload" → multipart FormData (catalog_file + JSON fields)
 */
export async function createChefDistributor(
  data: ChefDistributorCreateRequest,
  catalogFile?: File,
): Promise<ApiResponse<ChefDistributorCreateResponse>> {
  const authToken = getAuthToken();
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }

  if (catalogFile) {
    // multipart upload
    const form = new FormData();
    form.append('mode', data.mode);
    if (data.distributor_company_name) form.append('distributor_company_name', data.distributor_company_name);
    if (data.rep_contact) form.append('rep_contact', JSON.stringify(data.rep_contact));
    form.append('catalog_file', catalogFile);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chef/distributors`, {
        method: 'POST',
        headers,
        body: form,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.error || `HTTP ${response.status}`, status: response.status };
      }
      const responseData = await response.json();
      return { data: responseData };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  // JSON body for pick / request
  headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chef/distributors`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}`, status: response.status };
    }
    const responseData = await response.json();
    return { data: responseData };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}
```

- [ ] **Step 2: Verify no TS errors by running the build (done at end)**

---

### Task 2: Create ChefDistributorEntryPage

**Files:**
- Create: `src/app/pages/chef/ChefDistributorEntryPage.tsx`

- [ ] **Step 1: Create the page component**

See full implementation in Task execution below.

---

### Task 3: Wire route in routes.tsx

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Import the new page**

Add to imports:
```typescript
import { ChefDistributorEntryPage } from "./pages/chef/ChefDistributorEntryPage";
```

- [ ] **Step 2: Add route inside ChefShellLayout children**

Inside the `ChefShellLayout` children array, add:
```typescript
{ path: "chef/distributor/new", Component: ChefDistributorEntryPage },
```

---

### Task 4: Retarget [+] Build Quote buttons

**Files:**
- Modify: `src/app/components/chef/ChefShellLayout.tsx`
- Modify: `src/app/components/chef/ChefTabDesktopShell.tsx`
- Modify: `src/app/components/chef/ChefTabBar.tsx`

- [ ] **Step 1: Add `distributor-new` target to ChefShellLayout.navTab**

In `navTab` function, add before the final closing brace:
```typescript
if (target === 'distributor-new') return navigate('/chef/distributor/new');
```

- [ ] **Step 2: Retarget desktop sidebar [+] button**

Change `onClick={() => onNav('entry')}` (line ~168) to:
```typescript
onClick={() => onNav('distributor-new')}
```

- [ ] **Step 3: Retarget mobile tab bar [+] button**

Change `target: 'entry'` on the build tab (line ~101) to:
```typescript
target: 'distributor-new'
```

---

### Task 5: Build verification

- [ ] **Step 1: Run npm run build**

```bash
npm run build
```
Expected: zero TS errors, build succeeds.

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/chef/ChefDistributorEntryPage.tsx \
        src/app/services/api.ts \
        src/app/routes.tsx \
        src/app/components/chef/ChefShellLayout.tsx \
        src/app/components/chef/ChefTabDesktopShell.tsx \
        src/app/components/chef/ChefTabBar.tsx \
        docs/superpowers/plans/2026-05-27-chef-distributor-entry.md
git commit -m "feat(chef): ChefDistributorEntryPage with Pick/Upload/Request modes (Item 5)"
```
