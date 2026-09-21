type LogLevel = 'info' | 'warn' | 'error' | 'audit';

interface LogPayload {
  event: string;
  level?: LogLevel;
  timestamp?: string;
  userId?: string;
  vendorId?: string;
  orderId?: string;
  amount?: number;
  status?: string;
  details?: Record<string, unknown>;
  error?: string | Error;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'cvv',
  'cardnumber',
  'shippingaddress',
]);

/**
 * Sanitizes arbitrary objects to guarantee secrets and full PII never leak into server logs.
 */
function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 4) return '[Truncated]';
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function writeLog(level: LogLevel, event: string, payload: Omit<LogPayload, 'event' | 'level'> = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(sanitize(payload) as Record<string, unknown>),
  };

  const output = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (event: string, payload?: Omit<LogPayload, 'event' | 'level'>) => writeLog('info', event, payload),
  warn: (event: string, payload?: Omit<LogPayload, 'event' | 'level'>) => writeLog('warn', event, payload),
  error: (event: string, error?: unknown, payload?: Omit<LogPayload, 'event' | 'level' | 'error'>) => {
    const errorStr = error instanceof Error ? `${error.name}: ${error.message}` : String(error || 'Unknown error');
    writeLog('error', event, { ...payload, error: errorStr });
  },
  audit: (event: string, payload?: Omit<LogPayload, 'event' | 'level'>) => writeLog('audit', event, payload),

  // Structured domain event loggers
  authSuccess: (userId: string, role: string, email: string) =>
    writeLog('audit', 'AUTH_SUCCESS', { userId, details: { role, emailDomain: email.split('@')[1] } }),

  authFailure: (reason: string, email?: string) =>
    writeLog('warn', 'AUTH_FAILURE', { details: { reason, emailDomain: email ? email.split('@')[1] : undefined } }),

  vendorStatusChanged: (vendorId: string, oldStatus: string, newStatus: string, adminId: string) =>
    writeLog('audit', 'VENDOR_STATUS_CHANGE', { vendorId, userId: adminId, details: { oldStatus, newStatus } }),

  productCreated: (productId: string, vendorId: string, sku: string, stock: number) =>
    writeLog('audit', 'PRODUCT_CREATED', { vendorId, details: { productId, sku, stock } }),

  orderCreated: (orderId: string, customerId: string, totalAmount: number, vendorOrderCount: number) =>
    writeLog('audit', 'ORDER_CREATED', { orderId, userId: customerId, amount: totalAmount, details: { vendorOrderCount } }),

  paymentVerified: (paymentId: string, orderId: string, amount: number, referenceId: string) =>
    writeLog('audit', 'PAYMENT_VERIFIED', { orderId, amount, details: { paymentId, referenceId } }),

  paymentFailed: (paymentId: string, orderId: string, reason: string) =>
    writeLog('warn', 'PAYMENT_FAILED', { orderId, details: { paymentId, reason } }),

  orderCancelled: (orderId: string, customerId: string, restoredItemsCount: number) =>
    writeLog('audit', 'ORDER_CANCELLED', { orderId, userId: customerId, details: { restoredItemsCount } }),

  settlementRequested: (settlementId: string, vendorId: string, amount: number) =>
    writeLog('audit', 'SETTLEMENT_REQUESTED', { vendorId, amount, details: { settlementId } }),

  settlementProcessed: (settlementId: string, vendorId: string, status: string, adminId: string) =>
    writeLog('audit', 'SETTLEMENT_PROCESSED', { vendorId, userId: adminId, status, details: { settlementId } }),
};
