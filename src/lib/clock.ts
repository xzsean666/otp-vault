type ClockListener = (timestampMs: number) => void;

const listeners = new Set<ClockListener>();
let timerId: ReturnType<typeof setInterval> | null = null;
let visibilityHandlerAdded = false;

function notifyAll(timestampMs = Date.now()) {
  listeners.forEach((listener) => {
    try {
      listener(timestampMs);
    } catch (err) {
      console.error('Error in clock subscriber:', err);
    }
  });
}

function handleVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    notifyAll(Date.now());
  }
}

/**
 * Subscribe to a unified 1-second clock pulse.
 * Shares a single setInterval and visibilitychange listener across all TOTP cards.
 */
export function subscribeClock(listener: ClockListener): () => void {
  listeners.add(listener);

  if (!timerId && typeof window !== 'undefined') {
    timerId = setInterval(() => {
      notifyAll(Date.now());
    }, 1000);
  }

  if (!visibilityHandlerAdded && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityHandlerAdded = true;
  }

  // Initial trigger immediately
  listener(Date.now());

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      if (visibilityHandlerAdded && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        visibilityHandlerAdded = false;
      }
    }
  };
}
