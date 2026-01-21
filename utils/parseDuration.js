// Parses duration strings like: 10s, 5m, 2h, 3d
// Returns milliseconds (number) or null if invalid.
export function parseDurationToMs(input) {
    if (typeof input !== "string") return null;

    const raw = input.trim().toLowerCase();
    if (!raw) return null;

    // Allow e.g. "15m" or "1.5h"
    const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(s|m|h|d)$/);
    if (!match) return null;

    const value = Number(match[1]);
    const unit = match[2];

    if (!Number.isFinite(value) || value <= 0) return null;

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    const ms = Math.round(value * multipliers[unit]);
    if (!Number.isFinite(ms) || ms <= 0) return null;

    return ms;
}

export function formatDurationMs(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}
