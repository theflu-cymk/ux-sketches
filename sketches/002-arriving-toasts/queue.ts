/** Which toasts are on the shelf (oldest first) and when the next one arrives. Times in seconds. */
export type ToastQueue = { live: number[]; nextAt: number; nextId: number }
export type QueueStep = { state: ToastQueue; spawn: number | null; evict: number | null }

export function emptyQueue(now: number): ToastQueue {
  return { live: [], nextAt: now, nextId: 0 }
}

/** Adds a toast now. When the shelf is over capacity, the oldest one is evicted. */
export function pushToast(s: ToastQueue, cap: number): QueueStep {
  const live = [...s.live, s.nextId]
  const evict = live.length > cap ? live.shift()! : null
  return { state: { ...s, live, nextId: s.nextId + 1 }, spawn: s.nextId, evict }
}

/** Automatic arrivals: at most one per call, on the interval, never catching up after a pause. */
export function toastQueue(s: ToastQueue, now: number, o: { interval: number; cap: number; auto: boolean }): QueueStep {
  if (!o.auto || now < s.nextAt) return { state: s, spawn: null, evict: null }
  const r = pushToast(s, o.cap)
  return { ...r, state: { ...r.state, nextAt: now + o.interval } }
}

export function removeToast(s: ToastQueue, id: number): ToastQueue {
  return { ...s, live: s.live.filter((x) => x !== id) }
}
