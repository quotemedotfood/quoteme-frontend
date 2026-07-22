// useAsyncMutation.test.tsx
//
// Covers the shared post-mutation refresh hook built for bugs #31/#32:
// the synchronous in-flight guard (prevents double submit), the onSuccess
// contract (resync + close called together from one place), and the
// success/failure/error paths.
//
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsyncMutation } from './useAsyncMutation';

/** Deferred promise helper so a test can control exactly when a mock
 * mutation resolves, to simulate two calls overlapping in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('useAsyncMutation - synchronous in-flight guard blocks a concurrent second call', () => {
  it('ignores a second run() while the first is still in flight (only one underlying call fires)', async () => {
    const gate = deferred<{ data?: string; error?: string }>();
    const mutationFn = vi.fn(() => gate.promise);

    const { result } = renderHook(() => useAsyncMutation(mutationFn));

    let firstResult: boolean | undefined;
    let secondResult: boolean | undefined;

    // Fire both calls before the mutation resolves. If the guard were only
    // the `loading` state (post-render), this second call could slip through
    // in the same tick, since state updates from the first call have not
    // been committed yet.
    act(() => {
      result.current.run().then((v) => {
        firstResult = v;
      });
      result.current.run().then((v) => {
        secondResult = v;
      });
    });

    // Only one underlying call ever fired, proving the second run() was
    // rejected synchronously rather than queued or debounced.
    expect(mutationFn).toHaveBeenCalledTimes(1);

    act(() => {
      gate.resolve({ data: 'ok' });
    });

    await waitFor(() => {
      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it('allows a new run() once the previous one has settled', async () => {
    const mutationFn = vi.fn(async () => ({ data: 'ok' }));
    const { result } = renderHook(() => useAsyncMutation(mutationFn));

    let first: boolean | undefined;
    await act(async () => {
      first = await result.current.run();
    });
    expect(first).toBe(true);

    let second: boolean | undefined;
    await act(async () => {
      second = await result.current.run();
    });
    expect(second).toBe(true);

    expect(mutationFn).toHaveBeenCalledTimes(2);
  });
});

describe('useAsyncMutation - onSuccess is the single place resync + close happen together', () => {
  it('calls onSuccess with the response data on success, and sets loading/error correctly', async () => {
    const onSuccess = vi.fn();
    const mutationFn = vi.fn(async () => ({ data: { status: 'sent' } }));

    const { result } = renderHook(() => useAsyncMutation(mutationFn, { onSuccess }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run();
    });

    expect(ok).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith({ status: 'sent' });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not call onSuccess and surfaces the error when the mutation returns res.error', async () => {
    const onSuccess = vi.fn();
    const mutationFn = vi.fn(async () => ({ error: 'Something went wrong' }));

    const { result } = renderHook(() => useAsyncMutation(mutationFn, { onSuccess }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run();
    });

    expect(ok).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Something went wrong');
  });

  it('calls onSettled after both success and failure', async () => {
    const onSettled = vi.fn();
    const okFn = vi.fn(async () => ({ data: 'ok' }));
    const { result: okResult } = renderHook(() => useAsyncMutation(okFn, { onSettled }));
    await act(async () => {
      await okResult.current.run();
    });
    expect(onSettled).toHaveBeenCalledTimes(1);

    const failFn = vi.fn(async () => ({ error: 'nope' }));
    const { result: failResult } = renderHook(() => useAsyncMutation(failFn, { onSettled }));
    await act(async () => {
      await failResult.current.run();
    });
    expect(onSettled).toHaveBeenCalledTimes(2);
  });
});
