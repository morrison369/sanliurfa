import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { validateWithSchema, type ValidationSchema } from '../../../lib/validation';

const couponValidateSchema: ValidationSchema = {
  code: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 },
  amount: { type: 'number' as const, required: true, min: 0, max: 1_000_000 },
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz JSON gövdesi', type: '/problems/coupons-validate-parse', instance: '/api/coupons/validate' });
  }

  const validation = validateWithSchema(body, couponValidateSchema);
  if (!validation.valid) {
    return problemJson({ status: 422, title: 'Geçersiz Kupon Verisi', detail: validation.errors?.[0] || 'Geçersiz veri', type: '/problems/coupons-validate-fields', instance: '/api/coupons/validate' });
  }

  const code = body.code as string;
  const amount = body.amount as number;

  try {
    const coupon = await queryOne(
      `SELECT code, discount_type, discount_value
       FROM coupons WHERE code = $1 AND active = true AND (valid_until IS NULL OR valid_until > NOW())`,
      [code]
    );

    if (!coupon) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçersiz kupon',
        type: '/problems/coupons-validate-invalid',
        instance: '/api/coupons/validate',
      });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (amount * coupon.discount_value) / 100;
    } else {
      discount = coupon.discount_value;
    }

    return apiResponse({
      valid: true,
      discount,
      final_amount: amount - discount,
    }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kupon Doğrulanamadı',
      detail: safeErrorDetail(error, 'Kupon doğrulama başarısız'),
      type: '/problems/coupons-validate-failed',
      instance: '/api/coupons/validate',
    });
  }
};
