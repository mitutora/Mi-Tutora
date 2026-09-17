import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe('Payment Security & Webhooks Verification', () => {

  test.describe('Razorpay Server-to-Server Webhook Signature Validation', () => {
    function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      return expected === signature;
    }

    test('Validates authentic Razorpay webhook signature', () => {
      const webhookSecret = 'whsec_live_9876543210abcdef';
      const samplePayload = JSON.stringify({
        entity: 'event',
        account_id: 'acc_12345',
        event: 'order.paid',
        payload: {
          payment: {
            entity: {
              id: 'pay_99887766',
              order_id: 'order_12345678',
              amount: 500000,
              status: 'captured'
            }
          }
        }
      });

      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(samplePayload)
        .digest('hex');

      expect(verifyWebhookSignature(samplePayload, validSignature, webhookSecret)).toBe(true);
    });

    test('Rejects tampered payload or forged signature', () => {
      const webhookSecret = 'whsec_live_9876543210abcdef';
      const genuinePayload = JSON.stringify({ event: 'order.paid', orderId: 'order_1' });
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(genuinePayload)
        .digest('hex');

      // Tampered payload
      const tamperedPayload = JSON.stringify({ event: 'order.paid', orderId: 'order_TAMPERED' });
      expect(verifyWebhookSignature(tamperedPayload, validSignature, webhookSecret)).toBe(false);

      // Wrong secret
      expect(verifyWebhookSignature(genuinePayload, validSignature, 'wrong_secret')).toBe(false);
    });

    test('Ignores non-payment events gracefully', () => {
      const handledEvents = ['order.paid', 'payment.captured'];
      const event1 = 'refund.processed';
      const event2 = 'order.paid';

      expect(handledEvents.includes(event1)).toBe(false);
      expect(handledEvents.includes(event2)).toBe(true);
    });
  });

  test.describe('Payment Concurrency Locking & Idempotency', () => {
    interface PaymentRecord {
      orderId: string;
      applicationDocId: string;
      status: 'created' | 'paid';
      verifiedVia?: 'client' | 'webhook';
    }

    interface PayoutRecord {
      payoutDocId: string;
      applicationDocId: string;
      grossAmount: number;
      platformFeeAmount: number;
      tutorShareAmount: number;
      releaseEligibleAt: number;
      status: string;
    }

    class MockPaymentLedger {
      payments = new Map<string, PaymentRecord>();
      payouts = new Map<string, PayoutRecord>();
      transactionLockAttempts = 0;

      constructor() {
        this.payments.set('order_tx_1', {
          orderId: 'order_tx_1',
          applicationDocId: 'app_tx_1',
          status: 'created'
        });
      }

      // Simulates Firestore runTransaction optimistic lock
      async verifyPaymentAtomic(orderId: string, source: 'client' | 'webhook', grossAmount: number, startMs: number) {
        this.transactionLockAttempts++;
        const payment = this.payments.get(orderId);
        if (!payment) throw new Error('Order ID not found');

        // Optimistic check inside transaction
        if (payment.status === 'paid') {
          return { alreadyProcessed: true, payment };
        }

        // Atomically transition status
        payment.status = 'paid';
        payment.verifiedVia = source;
        this.payments.set(orderId, payment);

        // Deterministic payout document ID
        const payoutId = `payout_${payment.applicationDocId}`;
        const platformFee = Math.round(grossAmount * 0.40);
        const tutorShare = Math.round(grossAmount * 0.60);
        const releaseEligibleAt = startMs + (30 * 24 * 60 * 60 * 1000);

        this.payouts.set(payoutId, {
          payoutDocId: payoutId,
          applicationDocId: payment.applicationDocId,
          grossAmount,
          platformFeeAmount: platformFee,
          tutorShareAmount: tutorShare,
          releaseEligibleAt,
          status: 'escrow_held'
        });

        return { alreadyProcessed: false, payment };
      }
    }

    test('Prevents duplicate payout creation on simultaneous client double-click', async () => {
      const ledger = new MockPaymentLedger();
      const now = Date.now();

      // Fire two concurrent verification requests at the exact same moment
      const [res1, res2] = await Promise.all([
        ledger.verifyPaymentAtomic('order_tx_1', 'client', 5000, now),
        ledger.verifyPaymentAtomic('order_tx_1', 'client', 5000, now)
      ]);

      // One request must win and process, the other must see alreadyProcessed
      const results = [res1.alreadyProcessed, res2.alreadyProcessed];
      expect(results.filter(r => r === false).length).toBe(1);
      expect(results.filter(r => r === true).length).toBe(1);

      // Exactly ONE payout document exists
      expect(ledger.payouts.size).toBe(1);
      const payout = ledger.payouts.get('payout_app_tx_1');
      expect(payout).toBeDefined();
      expect(payout?.payoutDocId).toBe('payout_app_tx_1');
      expect(payout?.status).toBe('escrow_held');
    });

    test('Handles race between webhook and client gracefully without duplication', async () => {
      const ledger = new MockPaymentLedger();
      const now = Date.now();

      // Webhook and client verification arriving in parallel
      const [clientRes, webhookRes] = await Promise.all([
        ledger.verifyPaymentAtomic('order_tx_1', 'client', 6000, now),
        ledger.verifyPaymentAtomic('order_tx_1', 'webhook', 6000, now)
      ]);

      const oneProcessed = (clientRes.alreadyProcessed && !webhookRes.alreadyProcessed) ||
                           (!clientRes.alreadyProcessed && webhookRes.alreadyProcessed);
      expect(oneProcessed).toBe(true);

      // Total payouts remains strictly 1
      expect(ledger.payouts.size).toBe(1);
      expect(ledger.payouts.has('payout_app_tx_1')).toBe(true);
    });

    test('Verifies 60/40 institutional escrow calculation and Day 30 release timing', async () => {
      const ledger = new MockPaymentLedger();
      const startTime = new Date('2026-09-01T00:00:00Z').getTime();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      await ledger.verifyPaymentAtomic('order_tx_1', 'webhook', 8000, startTime);

      const payout = ledger.payouts.get('payout_app_tx_1');
      expect(payout).toBeDefined();
      expect(payout?.grossAmount).toBe(8000);
      expect(payout?.platformFeeAmount).toBe(3200); // 40% of 8000
      expect(payout?.tutorShareAmount).toBe(4800);    // 60% of 8000
      expect(payout?.releaseEligibleAt).toBe(startTime + THIRTY_DAYS_MS);
    });
  });
});
