// useAsyncMutation.ts
//
// Shared hook for the post-mutation refresh pattern (bugs #31, #32).
//
// The app has no server-state library (no react-query / SWR / RTK Query).
// Every mutation is a hand-rolled useState + fetchWithAuth<T>() call that
// returns an ApiResponse<T> = { data?, error?, ... } (see
// src/app/services/api.ts:4-12). Symptoms #31 (status badge stays stale
// after a successful send) and #32 (drawer never closes after a successful
// send) are the SAME missing wiring: call sites set a "success" flag but
// never resync local state AND close the modal/drawer TOGETHER, in one
// place, on the success path. This hook enforces that contract once so it
// cannot be forgotten at a new call site.
//
// Usage:
//   const { run, loading, error } = useAsyncMutation(sendQuote, {
//     onSuccess: (data) => {
//       // resync + close together, in the same callback
//       refetchQuote();
//       setDrawerOpen(false);
//     },
//   });
//   ...
//   onClick={() => run(quoteId, email, note)}
import { useCallback, useRef, useState } from 'react';

/** Matches the ApiResponse<T> convention from services/api.ts without importing it
 * (keeps this hook decoupled from any one API module's exact type). */
export interface AsyncMutationResponse<T> {
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export interface UseAsyncMutationOptions<T> {
  /** Called with the response payload once the mutation succeeds (res.error is falsy).
   * This is the ONE place call sites should both resync state and close any
   * open drawer/modal, so the two can never drift apart again. */
  onSuccess?: (data: T | undefined) => void | Promise<void>;
  /** Called after every run, success or failure, once loading has been cleared. */
  onSettled?: () => void;
}

export interface UseAsyncMutationResult<Args extends unknown[]> {
  /** Runs the mutation. Returns true on success, false on failure or if a call
   * was already in flight (the second call is ignored, not queued). */
  run: (...args: Args) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useAsyncMutation<T, Args extends unknown[]>(
  mutationFn: (...args: Args) => Promise<AsyncMutationResponse<T>>,
  options: UseAsyncMutationOptions<T> = {}
): UseAsyncMutationResult<Args> {
  const { onSuccess, onSettled } = options;

  // Synchronous in-flight guard. React state (loading) only updates on the
  // next render, which is too late to stop a second click/call that fires
  // before that render happens (disabled=busy is post-render and can't help
  // here). A ref is mutated synchronously, so it blocks a concurrent call
  // made from the very same event handler or a fast double click.
  const inFlightRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<boolean> => {
      // Must be the first line: guard before any await, so a synchronous
      // second call is rejected immediately rather than racing the first.
      if (inFlightRef.current) return false;
      inFlightRef.current = true;

      setLoading(true);
      setError(null);
      try {
        const res = await mutationFn(...args);
        if (res.error) {
          setError(res.error);
          return false;
        }
        await onSuccess?.(res.data);
        return true;
      } catch (err: any) {
        setError(err?.message || 'Network error');
        return false;
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        onSettled?.();
      }
    },
    // mutationFn/onSuccess/onSettled are expected to be referentially stable
    // enough for call sites (matches the rest of the codebase's useCallback
    // usage, e.g. ExportFinalizePage's handleOpenPdfPreview).
    [mutationFn, onSuccess, onSettled]
  );

  return { run, loading, error };
}
