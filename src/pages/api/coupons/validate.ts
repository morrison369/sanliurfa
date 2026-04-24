import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { problemJson } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  const { code, amount } = await request.json();

  // Optimized: select only necessary columns instead of SELECT *
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

  return new Response(JSON.stringify({ 
    valid: true, 
    discount,
    final_amount: amount - discount 
  }), { status: 200 });
};
