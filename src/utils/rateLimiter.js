/**
 * Utility sederhana untuk rate limiting berbasis memori
 */
class RateLimiter {
    constructor(limit = 10, windowMs = 60000) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.requests = new Map(); // key: identifier, value: { count, start }
    }

    isRateLimited(id) {
        const now = Date.now();
        const entry = this.requests.get(id) || { count: 0, start: now };


        if (now - entry.start > this.windowMs) {
            this.requests.set(id, { count: 1, start: now });
            return false;
        }

        entry.count++;
        this.requests.set(id, entry);

        return entry.count > this.limit;
    }

    getRemaining(id) {
        const entry = this.requests.get(id);
        if (!entry) return this.limit;
        return Math.max(0, this.limit - entry.count);
    }
}

module.exports = RateLimiter;
