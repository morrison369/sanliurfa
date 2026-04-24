/**
 * iyzico Payment Integration
 * Turkish payment gateway
 */

import { query } from '../postgres';

export interface PaymentRequest {
  userId: string;
  userName: string;
  userEmail: string;
  userIp: string;
  amount: number; // in TL
  currency?: string;
  installment?: number;
  card: CardInfo;
  items: PaymentItem[];
  callbackUrl: string;
}

export interface CardInfo {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  registerCard?: boolean;
}

export interface PaymentItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity?: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  conversationId?: string;
  errorMessage?: string;
  errorCode?: string;
  threeDSHtmlContent?: string; // For 3D Secure
}

export interface InstallmentInfo {
  binNumber: string;
  price: number;
  installments: Array<{
    installmentNumber: number;
    totalPrice: number;
    installmentPrice: number;
  }>;
}

/**
 * Create payment request
 */
export async function createPayment(payment: PaymentRequest): Promise<PaymentResult> {
  try {
    const requestBody = {
      locale: 'tr',
      conversationId: `conv_${Date.now()}`,
      price: payment.amount.toString(),
      paidPrice: payment.amount.toString(),
      currency: payment.currency || 'TRY',
      installment: payment.installment || 1,
      basketId: `basket_${Date.now()}`,
      paymentChannel: 'WEB',
      paymentGroup: 'SUBSCRIPTION',
      callbackUrl: payment.callbackUrl,
      buyer: {
        id: payment.userId,
        name: payment.userName.split(' ')[0] || 'User',
        surname: payment.userName.split(' ').slice(1).join(' ') || 'User',
        email: payment.userEmail,
        identityNumber: '11111111111', // Required by iyzico
        registrationAddress: 'Turkey',
        city: 'Istanbul',
        country: 'Turkey',
        ip: payment.userIp,
      },
      shippingAddress: {
        contactName: payment.userName,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Turkey',
      },
      billingAddress: {
        contactName: payment.userName,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Turkey',
      },
      basketItems: payment.items.map(item => ({
        id: item.id,
        name: item.name,
        category1: item.category,
        itemType: 'VIRTUAL',
        price: item.price.toString(),
      })),
      paymentCard: {
        cardHolderName: payment.card.holderName,
        cardNumber: payment.card.number.replace(/\s/g, ''),
        expireMonth: payment.card.expiryMonth,
        expireYear: payment.card.expiryYear,
        cvc: payment.card.cvc,
        registerCard: payment.card.registerCard ? 1 : 0,
      },
    };

    // In production, make actual API call
    // const response = await fetch(`${IYZICO_BASE_URL}/payment/auth`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': generateIyzicoAuth(requestBody),
    //   },
    //   body: JSON.stringify(requestBody),
    // });
    // const result = await response.json();

    // Mock response for development
    const mockResult = {
      status: 'success',
      paymentId: `pay_${Date.now()}`,
      conversationId: requestBody.conversationId,
      price: payment.amount,
      paidPrice: payment.amount,
      currency: 'TRY',
      installment: payment.installment || 1,
      paymentStatus: 'SUCCESS',
    };

    // Save payment to database
    await savePayment({
      userId: payment.userId,
      paymentId: mockResult.paymentId,
      amount: payment.amount,
      currency: 'TRY',
      status: 'completed',
      provider: 'iyzico',
      metadata: mockResult,
    });

    return {
      success: true,
      paymentId: mockResult.paymentId,
      status: mockResult.paymentStatus,
      conversationId: mockResult.conversationId,
    };
  } catch (error: any) {
    return {
      success: false,
      errorMessage: error.message,
    };
  }
}

/**
 * Check installment options
 */
export async function getInstallmentInfo(
  binNumber: string,
  price: number
): Promise<InstallmentInfo | null> {
  try {
    // Mock installment info
    return {
      binNumber,
      price,
      installments: [
        { installmentNumber: 1, totalPrice: price, installmentPrice: price },
        { installmentNumber: 3, totalPrice: price * 1.05, installmentPrice: (price * 1.05) / 3 },
        { installmentNumber: 6, totalPrice: price * 1.1, installmentPrice: (price * 1.1) / 6 },
        { installmentNumber: 9, totalPrice: price * 1.15, installmentPrice: (price * 1.15) / 9 },
      ],
    };
  } catch {
    return null;
  }
}

/**
 * Cancel/refund payment
 */
export async function refundPayment(
  paymentId: string,
  _amount?: number
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    // Mock refund
    const refundId = `ref_${Date.now()}`;
    
    await query(
      `UPDATE payments SET status = 'refunded', refund_id = $1, refunded_at = NOW() WHERE payment_id = $2`,
      [refundId, paymentId]
    );

    return { success: true, refundId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get payment details
 */
export async function getPaymentDetails(paymentId: string): Promise<any | null> {
  const result = await query(
    `SELECT * FROM payments WHERE payment_id = $1`,
    [paymentId]
  );

  return result.rows[0] || null;
}

/**
 * Save payment to database
 */
async function savePayment(data: {
  userId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  metadata: any;
}): Promise<void> {
  await query(
    `INSERT INTO payments (user_id, payment_id, amount, currency, status, provider, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [data.userId, data.paymentId, data.amount, data.currency, data.status, data.provider, JSON.stringify(data.metadata)]
  );
}

/**
 * Webhook handler for iyzico callbacks
 */
export async function handleWebhook(payload: any): Promise<void> {
  const { status, paymentId } = payload;

  if (status === 'SUCCESS') {
    await query(
      `UPDATE payments SET status = 'completed', webhook_received = true, updated_at = NOW() WHERE payment_id = $1`,
      [paymentId]
    );
  } else {
    await query(
      `UPDATE payments SET status = 'failed', webhook_received = true, error_message = $2, updated_at = NOW() WHERE payment_id = $1`,
      [paymentId, payload.errorMessage]
    );
  }
}

/**
 * Get user payment history
 */
export async function getUserPayments(userId: string): Promise<any[]> {
  const result = await query(
    `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Calculate commission
 */
export function calculateCommission(amount: number): { commission: number; netAmount: number } {
  const commissionRate = 0.029; // 2.9%
  const fixedFee = 0.5; // 0.5 TL
  
  const commission = (amount * commissionRate) + fixedFee;
  const netAmount = amount - commission;
  
  return { commission, netAmount };
}
