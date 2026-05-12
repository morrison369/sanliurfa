/**
 * Invoice Generator
 * PDF invoice generation and management
 */

import { query } from '../postgres';

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  companyInfo: CompanyInfo;
  customerInfo: CustomerInfo;
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  taxOffice?: string;
  taxNumber?: string;
  phone?: string;
  email?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  address?: string;
  taxOffice?: string;
  taxNumber?: string;
}

// Default company info
const defaultCompanyInfo: CompanyInfo = {
  name: 'Şanlıurfa Turizm Platformu A.Ş.',
  address: 'Haliliye, Şanlıurfa, Türkiye',
  taxOffice: 'Haliliye Vergi Dairesi',
  taxNumber: '1234567890',
  phone: '+90 414 123 45 67',
  email: 'fatura@sanliurfa.com',
};

/**
 * Create invoice
 */
export async function createInvoice(data: {
  userId: string;
  subscriptionId?: string;
  items: InvoiceItem[];
  customerInfo: CustomerInfo;
  notes?: string;
}): Promise<Invoice> {
  const taxRate = 0.20; // 20% KDV
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  const invoice: Invoice = {
    id: `inv_${Date.now()}`,
    userId: data.userId,
    ...(data.subscriptionId ? { subscriptionId: data.subscriptionId } : {}),
    invoiceNumber,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    amount: subtotal,
    taxRate: 20,
    taxAmount,
    totalAmount,
    currency: 'TRY',
    status: 'pending',
    items: data.items,
    companyInfo: defaultCompanyInfo,
    customerInfo: data.customerInfo,
    ...(data.notes ? { notes: data.notes } : {}),
  };

  await query(
    `INSERT INTO invoices (id, user_id, subscription_id, invoice_number, issue_date, due_date,
                          amount, tax_rate, tax_amount, total_amount, currency, status, items,
                          company_info, customer_info, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      invoice.id,
      invoice.userId,
      invoice.subscriptionId,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate,
      invoice.amount,
      invoice.taxRate,
      invoice.taxAmount,
      invoice.totalAmount,
      invoice.currency,
      invoice.status,
      JSON.stringify(invoice.items),
      JSON.stringify(invoice.companyInfo),
      JSON.stringify(invoice.customerInfo),
      invoice.notes,
    ]
  );

  return invoice;
}

/**
 * Generate invoice number
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const result = await query(
    `SELECT COUNT(*) as count FROM invoices WHERE EXTRACT(YEAR FROM issue_date) = $1`,
    [year]
  );
  
  const count = parseInt(result.rows[0].count, 10) + 1;
  return `INV-${year}${month}-${String(count).padStart(6, '0')}`;
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: string): Promise<Invoice | null> {
  const result = await query('SELECT * FROM invoices WHERE id = $1', [id]);
  
  if (result.rows.length === 0) return null;
  
  return mapInvoiceRow(result.rows[0]);
}

/**
 * Get user invoices
 */
export async function getUserInvoices(
  userId: string,
  options: { status?: Invoice['status']; limit?: number; offset?: number } = {}
): Promise<{ invoices: Invoice[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;
  
  let sql = 'SELECT * FROM invoices WHERE user_id = $1';
  const params: any[] = [userId];
  
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  
  const countSql = `SELECT COUNT(*) FROM (${sql}) AS count_query`;
  const countParams = [...params];
  sql += ` ORDER BY issue_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [countResult, result] = await Promise.all([
    query(countSql, countParams),
    query(sql, [...params, limit, offset]),
  ]);
  
  return {
    invoices: result.rows.map(mapInvoiceRow),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  invoiceId: string,
  paymentId?: string
): Promise<void> {
  await query(
    `UPDATE invoices SET status = 'paid', paid_date = NOW(), payment_id = $2 WHERE id = $1`,
    [invoiceId, paymentId]
  );
}

/**
 * Cancel invoice
 */
export async function cancelInvoice(invoiceId: string): Promise<void> {
  await query(
    `UPDATE invoices SET status = 'cancelled' WHERE id = $1`,
    [invoiceId]
  );
}

/**
 * Generate HTML invoice
 */
export function generateInvoiceHTML(invoice: Invoice): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Fatura #${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-info h1 { color: #8B4513; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { color: #666; }
    .customer-info { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f4f4f4; }
    .text-right { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.9em; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .status.paid { background: #d4edda; color: #155724; }
    .status.pending { background: #fff3cd; color: #856404; }
    .status.overdue { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>${invoice.companyInfo.name}</h1>
        <p>${invoice.companyInfo.address}</p>
        <p>Vergi Dairesi: ${invoice.companyInfo.taxOffice || '-'}</p>
        <p>Vergi No: ${invoice.companyInfo.taxNumber || '-'}</p>
        <p>Tel: ${invoice.companyInfo.phone || '-'}</p>
      </div>
      <div class="invoice-info">
        <h2>FATURA</h2>
        <p><strong>Fatura No:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Tarih:</strong> ${invoice.issueDate.toLocaleDateString('tr-TR')}</p>
        <p><strong>Son Ödeme:</strong> ${invoice.dueDate.toLocaleDateString('tr-TR')}</p>
        <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span>
      </div>
    </div>

    <div class="customer-info">
      <h3>Fatura Adresi</h3>
      <p><strong>${invoice.customerInfo.name}</strong></p>
      <p>${invoice.customerInfo.email}</p>
      <p>${invoice.customerInfo.address || ''}</p>
      ${invoice.customerInfo.taxNumber ? `<p>Vergi No: ${invoice.customerInfo.taxNumber}</p>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Açıklama</th>
          <th class="text-right">Miktar</th>
          <th class="text-right">Birim Fiyat</th>
          <th class="text-right">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${item.unitPrice.toFixed(2)} TL</td>
            <td class="text-right">${item.total.toFixed(2)} TL</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Ara Toplam:</span>
        <span>${invoice.amount.toFixed(2)} TL</span>
      </div>
      <div class="total-row">
        <span>KDV (%${invoice.taxRate}):</span>
        <span>${invoice.taxAmount.toFixed(2)} TL</span>
      </div>
      <div class="total-row total">
        <span>GENEL TOPLAM:</span>
        <span>${invoice.totalAmount.toFixed(2)} TL</span>
      </div>
    </div>

    ${invoice.notes ? `
      <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
        <strong>Notlar:</strong><br>${invoice.notes}
      </div>
    ` : ''}

    <div class="footer">
      <p>${invoice.companyInfo.name} | ${invoice.companyInfo.email}</p>
      <p>Bu fatura elektronik ortamda oluşturulmuştur.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text invoice
 */
export function generateInvoiceText(invoice: Invoice): string {
  return `
FATURA
======

Fatura No: ${invoice.invoiceNumber}
Tarih: ${invoice.issueDate.toLocaleDateString('tr-TR')}
Son Ödeme: ${invoice.dueDate.toLocaleDateString('tr-TR')}
Durum: ${invoice.status.toUpperCase()}

FIRMA:
${invoice.companyInfo.name}
${invoice.companyInfo.address}
Vergi Dairesi: ${invoice.companyInfo.taxOffice || '-'}
Vergi No: ${invoice.companyInfo.taxNumber || '-'}

MUSTERI:
${invoice.customerInfo.name}
${invoice.customerInfo.email}
${invoice.customerInfo.address || ''}

URUNLER/HIZMETLER:
${invoice.items.map(item => `
- ${item.description}
  Miktar: ${item.quantity} x ${item.unitPrice.toFixed(2)} TL = ${item.total.toFixed(2)} TL
`).join('')}

OZET:
Ara Toplam: ${invoice.amount.toFixed(2)} TL
KDV (%${invoice.taxRate}): ${invoice.taxAmount.toFixed(2)} TL
GENEL TOPLAM: ${invoice.totalAmount.toFixed(2)} TL

${invoice.notes ? `Notlar: ${invoice.notes}` : ''}
`.trim();
}

/**
 * Process overdue invoices
 */
export async function processOverdueInvoices(): Promise<number> {
  const result = await query(
    `UPDATE invoices SET status = 'overdue' 
    WHERE status = 'pending' AND due_date < NOW()
    RETURNING id`
  );

  return result.rows.length;
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalInvoiced: number;
  totalPaid: number;
  totalOverdue: number;
  invoiceCount: number;
}> {
  const result = await query(
    `SELECT 
      SUM(total_amount) as total_invoiced,
      SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_paid,
      SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as total_overdue,
      COUNT(*) as invoice_count
    FROM invoices
    WHERE issue_date >= $1 AND issue_date <= $2`,
    [startDate, endDate]
  );

  return {
    totalInvoiced: parseFloat(result.rows[0].total_invoiced) || 0,
    totalPaid: parseFloat(result.rows[0].total_paid) || 0,
    totalOverdue: parseFloat(result.rows[0].total_overdue) || 0,
    invoiceCount: parseInt(result.rows[0].invoice_count, 10) || 0,
  };
}

function mapInvoiceRow(row: any): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    ...(row.subscription_id ? { subscriptionId: row.subscription_id } : {}),
    invoiceNumber: row.invoice_number,
    issueDate: new Date(row.issue_date),
    dueDate: new Date(row.due_date),
    ...(row.paid_date ? { paidDate: new Date(row.paid_date) } : {}),
    amount: parseFloat(row.amount),
    taxRate: row.tax_rate,
    taxAmount: parseFloat(row.tax_amount),
    totalAmount: parseFloat(row.total_amount),
    currency: row.currency,
    status: row.status,
    items: row.items,
    companyInfo: row.company_info,
    customerInfo: row.customer_info,
    notes: row.notes,
  };
}
