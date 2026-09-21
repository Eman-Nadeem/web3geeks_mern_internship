import crypto from 'crypto';

export interface MockPaymentResult {
  referenceId: string;
  provider: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  paidAt: Date | null;
  message: string;
}

/**
 * Generates a cryptographically random, server-side transaction reference.
 * Prevents client-supplied reference injection.
 */
export function generatePaymentReference(): string {
  const random = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now().toString(36);
  return `PAY-${timestamp}-${random}`.toUpperCase();
}

/**
 * Simulates processing via the mock gateway.
 */
export async function processMockPayment(params: {
  amount: number;
  currency?: string;
  method?: string;
  simulateFailure?: boolean;
}): Promise<MockPaymentResult> {
  const referenceId = generatePaymentReference();

  if (params.simulateFailure) {
    return {
      referenceId,
      provider: 'mock-gateway',
      status: 'FAILED',
      paidAt: null,
      message: 'Simulated payment processing failure.',
    };
  }

  // Simulated successful payment
  return {
    referenceId,
    provider: 'mock-gateway',
    status: 'PAID',
    paidAt: new Date(),
    message: 'Mock payment authorization successful.',
  };
}
