// Structured error architecture for AUTOLEADS.
// Every operational error records: category, timestamp, org context, retryable flag, safe message.
// No secret values are ever recorded.

export type ErrorCategory =
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'ORGANIZATION_CONTEXT_ERROR'
  | 'TENANT_SCOPE_ERROR'
  | 'VALIDATION_ERROR'
  | 'SOURCE_ERROR'
  | 'SOURCE_TIMEOUT'
  | 'SOURCE_CHANGED'
  | 'PARSER_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'CONNECTOR_ERROR'
  | 'GMAIL_ERROR'
  | 'DRIVE_ERROR'
  | 'CALENDAR_ERROR'
  | 'ESIGN_ERROR'
  | 'STRIPE_ERROR'
  | 'QUEUE_ERROR'
  | 'DATABASE_ERROR'
  | 'LLM_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface StructuredError {
  category: ErrorCategory;
  message: string;
  timestamp: string;
  organization_id?: string;
  job_id?: string;
  correlation_id?: string;
  function?: string;
  operation?: string;
  retryable: boolean;
  attempt?: number;
  resolution_state: 'unresolved' | 'retrying' | 'escalated' | 'resolved';
  safe_message: string;
}

// Create a structured error. The raw error is sanitized — only the safe_message
// is safe to show users; the full record is for internal logging/observability.
export function createError(
  category: ErrorCategory,
  rawError: any,
  context: {
    organization_id?: string;
    job_id?: string;
    correlation_id?: string;
    function?: string;
    operation?: string;
    attempt?: number;
  } = {}
): StructuredError {
  const rawMessage = rawError?.message || String(rawError || 'Unknown error');
  // Never expose secrets, tokens, API keys in messages
  const sanitized = rawMessage
    .replace(/(api[_-]?key|token|secret|password|bearer)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .replace(/sk_live_\w+|sk_test_\w+|pk_live_\w+|pk_test_\w+/g, '[STRIPE_KEY_REDACTED]')
    .slice(0, 500);

  const retryable = isRetryable(category, rawError);
  return {
    category,
    message: sanitized,
    timestamp: new Date().toISOString(),
    organization_id: context.organization_id,
    job_id: context.job_id,
    correlation_id: context.correlation_id,
    function: context.function,
    operation: context.operation,
    retryable,
    attempt: context.attempt,
    resolution_state: retryable ? 'retrying' : 'unresolved',
    safe_message: userSafeMessage(category),
  };
}

function isRetryable(category: ErrorCategory, rawError: any): boolean {
  if (category === 'RATE_LIMIT_ERROR') return true;
  if (category === 'SOURCE_TIMEOUT') return true;
  if (category === 'DATABASE_ERROR') return true;
  if (category === 'LLM_ERROR') return true;
  if (category === 'CONNECTOR_ERROR') return true;
  const status = rawError?.status || rawError?.statusCode;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  return false;
}

function userSafeMessage(category: ErrorCategory): string {
  const messages: Record<ErrorCategory, string> = {
    AUTHENTICATION_ERROR: 'Your session has expired. Please log in again.',
    AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
    ORGANIZATION_CONTEXT_ERROR: 'Organization context is required. Please select an organization.',
    TENANT_SCOPE_ERROR: 'This action is not permitted across organizations.',
    VALIDATION_ERROR: 'Some required information is missing or invalid.',
    SOURCE_ERROR: 'We could not reach the data source. Your existing data was not changed.',
    SOURCE_TIMEOUT: 'The data source took too long to respond. Please try again.',
    SOURCE_CHANGED: 'The source page has changed. We are updating our adapter.',
    PARSER_ERROR: 'We could not parse the data from this source.',
    RATE_LIMIT_ERROR: 'The source is rate-limiting requests. We will retry automatically.',
    CONNECTOR_ERROR: 'An integration connection needs to be reconnected.',
    GMAIL_ERROR: 'Your Gmail connection needs to be reconnected.',
    DRIVE_ERROR: 'Your Google Drive connection needs to be reconnected.',
    CALENDAR_ERROR: 'Your Google Calendar connection needs to be reconnected.',
    ESIGN_ERROR: 'The e-signature request could not be completed.',
    STRIPE_ERROR: 'The payment could not be processed. Please try again.',
    QUEUE_ERROR: 'A background job is delayed. It will run automatically.',
    DATABASE_ERROR: 'A temporary database error occurred. Please try again.',
    LLM_ERROR: 'The AI service is temporarily unavailable. Please try again.',
    CONFIGURATION_ERROR: 'Some configuration is missing. Please check your settings.',
    UNKNOWN_ERROR: 'Something went wrong. Your data was not changed.',
  };
  return messages[category] || messages.UNKNOWN_ERROR;
}

// Wrap an async operation with structured error handling and optional retry.
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    category: ErrorCategory;
    function?: string;
    operation?: string;
    organization_id?: string;
    job_id?: string;
    correlation_id?: string;
    maxRetries?: number;
    retryDelayMs?: number;
  }
): Promise<{ ok: true; data: T } | { ok: false; error: StructuredError }> {
  const maxRetries = context.maxRetries ?? 0;
  const retryDelayMs = context.retryDelayMs ?? 1000;
  let lastError: StructuredError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await operation();
      return { ok: true, data };
    } catch (e: any) {
      lastError = createError(context.category, e, {
        ...context,
        attempt: attempt + 1,
      });
      if (attempt < maxRetries && lastError.retryable) {
        await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)));
        continue;
      }
      return { ok: false, error: lastError };
    }
  }
  return { ok: false, error: lastError! };
}