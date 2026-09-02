// Freshness engine for AUTOLEADS.
// Tracks opportunity lifecycle states and drives re-verification cadence.
//
// States:
//   FRESH          — recently seen, active, within deadline
//   AGING          — not re-verified recently but still within deadline
//   STALE          — overdue for re-verification
//   EXPIRED        — bid deadline has passed
//   CLOSED         — source explicitly marked closed/cancelled
//   AWARDED        — source reports award made
//   CANCELLED      — source reports cancellation
//   SOURCE_CHANGED — source content hash changed since last verification
//   SOURCE_UNAVAILABLE — source returned 404 or timeout
//   UNKNOWN        — freshness cannot be determined

export type FreshnessStatus =
  | 'FRESH'
  | 'AGING'
  | 'STALE'
  | 'EXPIRED'
  | 'CLOSED'
  | 'AWARDED'
  | 'CANCELLED'
  | 'SOURCE_CHANGED'
  | 'SOURCE_UNAVAILABLE'
  | 'UNKNOWN';

export type DeadlineStatus =
  | 'OPEN'
  | 'CLOSING_SOON'
  | 'OVERDUE'
  | 'NO_DEADLINE'
  | 'CLOSED';

export interface FreshnessInput {
  first_seen_at?: string;
  retrieved_at?: string;
  last_seen_at?: string;
  last_verified_at?: string;
  source_updated_at?: string;
  bid_due_date?: string;
  stage?: string;
  verification_status?: string;
  source_available?: boolean;
  source_changed?: boolean;
  awarded?: boolean;
  cancelled?: boolean;
}

export interface FreshnessResult {
  freshness_status: FreshnessStatus;
  deadline_status: DeadlineStatus;
  next_verification_at: string;
  explanation: string;
}

const NOW = () => Date.now();
const HOURS = (h: number) => h * 60 * 60 * 1000;
const DAYS = (d: number) => d * 24 * 60 * 60 * 1000;

// Re-verification cadence varies by opportunity stage and deadline proximity.
function computeNextVerification(input: FreshnessInput, deadlineStatus: DeadlineStatus): string {
  const now = NOW();

  // Expired or closed — slow re-verification (weekly) just to catch reopen/reaward
  if (deadlineStatus === 'OVERDUE' || deadlineStatus === 'CLOSED') {
    return new Date(now + DAYS(7)).toISOString();
  }

  // Closing soon (<48h) — aggressive re-verification every 6 hours
  if (deadlineStatus === 'CLOSING_SOON') {
    return new Date(now + HOURS(6)).toISOString();
  }

  // Planning signals (far future or no deadline) — slow verification (every 3 days)
  const stage = String(input.stage || '').toLowerCase();
  if (stage.includes('planning') || stage.includes('qualification')) {
    return new Date(now + DAYS(3)).toISOString();
  }

  // Active bid with open deadline — daily re-verification
  if (deadlineStatus === 'OPEN') {
    return new Date(now + DAYS(1)).toISOString();
  }

  // No deadline — weekly
  return new Date(now + DAYS(7)).toISOString();
}

export function computeFreshness(input: FreshnessInput): FreshnessResult {
  const now = NOW();

  // Source unavailable
  if (input.source_available === false) {
    return {
      freshness_status: 'SOURCE_UNAVAILABLE',
      deadline_status: 'UNKNOWN',
      next_verification_at: new Date(now + HOURS(6)).toISOString(),
      explanation: 'Source is unavailable (404 or timeout). Re-verification scheduled.',
    };
  }

  // Awarded
  if (input.awarded) {
    return {
      freshness_status: 'AWARDED',
      deadline_status: 'CLOSED',
      next_verification_at: new Date(now + DAYS(30)).toISOString(),
      explanation: 'Source reports this opportunity has been awarded.',
    };
  }

  // Cancelled
  if (input.cancelled) {
    return {
      freshness_status: 'CANCELLED',
      deadline_status: 'CLOSED',
      next_verification_at: new Date(now + DAYS(30)).toISOString(),
      explanation: 'Source reports this opportunity has been cancelled.',
    };
  }

  // Source changed
  if (input.source_changed) {
    return {
      freshness_status: 'SOURCE_CHANGED',
      deadline_status: 'UNKNOWN',
      next_verification_at: new Date(now + HOURS(2)).toISOString(),
      explanation: 'Source content has changed since last verification. Re-verification scheduled.',
    };
  }

  // Deadline status
  let deadlineStatus: DeadlineStatus = 'NO_DEADLINE';
  if (input.bid_due_date) {
    const dueMs = new Date(input.bid_due_date).getTime();
    if (isNaN(dueMs)) {
      deadlineStatus = 'NO_DEADLINE';
    } else if (dueMs < now) {
      deadlineStatus = 'OVERDUE';
    } else if (dueMs - now < HOURS(48)) {
      deadlineStatus = 'CLOSING_SOON';
    } else {
      deadlineStatus = 'OPEN';
    }
  }

  // Expired — bid deadline passed
  if (deadlineStatus === 'OVERDUE') {
    return {
      freshness_status: 'EXPIRED',
      deadline_status: deadlineStatus,
      next_verification_at: new Date(now + DAYS(7)).toISOString(),
      explanation: 'Bid deadline has passed. Opportunity is expired.',
    };
  }

  // Freshness based on last_verified_at
  const lastVerified = input.last_verified_at ? new Date(input.last_verified_at).getTime() : 0;
  const lastSeen = input.last_seen_at ? new Date(input.last_seen_at).getTime() : 0;
  const mostRecent = Math.max(lastVerified, lastSeen);

  if (mostRecent === 0) {
    // Never verified — unknown
    return {
      freshness_status: 'UNKNOWN',
      deadline_status: deadlineStatus,
      next_verification_at: new Date(now + HOURS(1)).toISOString(),
      explanation: 'Opportunity has not been verified yet.',
    };
  }

  const ageMs = now - mostRecent;
  const nextVerification = computeNextVerification(input, deadlineStatus);

  // FRESH: verified within last 24h
  if (ageMs < HOURS(24)) {
    return {
      freshness_status: 'FRESH',
      deadline_status: deadlineStatus,
      next_verification_at: nextVerification,
      explanation: 'Recently verified and active.',
    };
  }

  // AGING: verified within last 3 days
  if (ageMs < DAYS(3)) {
    return {
      freshness_status: 'AGING',
      deadline_status: deadlineStatus,
      next_verification_at: nextVerification,
      explanation: 'Opportunity is aging — re-verification recommended.',
    };
  }

  // STALE: overdue for re-verification
  return {
    freshness_status: 'STALE',
    deadline_status: deadlineStatus,
    next_verification_at: new Date(now + HOURS(1)).toISOString(),
    explanation: 'Opportunity is stale — re-verification overdue.',
  };
}

// Returns true if the opportunity should be treated as active/hot.
// Expired, stale, cancelled, and awarded opportunities are NOT hot.
export function isHotLead(freshness: FreshnessResult): boolean {
  return ['FRESH', 'AGING'].includes(freshness.freshness_status) &&
    ['OPEN', 'CLOSING_SOON'].includes(freshness.deadline_status);
}