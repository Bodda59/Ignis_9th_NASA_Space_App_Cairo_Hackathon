"""Short-lived in-process results for read-only requests."""
import threading
import time
from weakref import WeakKeyDictionary

_results, _lock = WeakKeyDictionary(), threading.Lock()


def remember(owner, key, seconds, compute):
    """Return compute(), reusing a result made for the same owner and key within the last `seconds`."""
    # shortcut: one process, bounded by a full reset; a change in the database shows up after `seconds`.
    with _lock:
        entries = _results.setdefault(owner, {})
        hit = entries.get(key)
        if hit and time.monotonic() - hit[0] < seconds:
            return hit[1]
    value = compute()
    with _lock:
        if len(entries) >= 512:
            entries.clear()
        entries[key] = (time.monotonic(), value)
    return value
