import { printInvoiceEngine } from './printInvoiceEngine';
import type { InvoiceData } from './printInvoiceEngine';

export const printInvoice = (
  sale: any,
  items: any[],
  companyName: string = 'SUPPLYRA',
  creatorName: string = '',
  language: string = 'ar'
) => {
  const notSetLabel = language === 'ar' ? 'غير محدد' : 'Not Set';

  const invoiceData: InvoiceData = {
    type: 'SALES',
    invoiceNumber: sale.order_number || sale.invoice_number || `#${sale.id?.slice(0,8).toUpperCase()}`,
    date: sale.order_date || sale.created_at,
    entityName: sale.customer?.name || (language === 'ar' ? 'عميل نقدي' : 'Walk-in Customer'),
    entityPhone: sale.customer?.mobile || sale.customer?.phone,
    entityAddress: sale.customer?.address,
    warehouseName: sale.warehouse?.name,
    status: sale.status,
    creatorName: creatorName || sale.created_by_name,
    notes: sale.notes,
    subtotal: Number(sale.subtotal || items.reduce((s, i) => s + (Number(i.total || i.total_price) || 0), 0)),
    discount: Number(sale.discount || 0),
    tax: Number(sale.tax || sale.tax_amount || 0),
    grandTotal: Number(sale.grand_total || sale.total_amount || 0),
    items: items.map(item => ({
      productName: item.product?.name || item.product_name || (language === 'ar' ? 'منتج غير معروف' : 'Unknown Product'),
      productCode: item.product?.product_code || item.product?.code || item.product?.sku,
      categoryName: item.product?.category?.name || notSetLabel,
      subcategoryName: item.product?.brand?.name || notSetLabel,
      quantity: item.quantity || 0,
      unitCode: item.unit?.code || item.unit?.name || (language === 'ar' ? 'وحدة' : 'Unit'),
      price: Number(item.selling_price || item.unit_price || item.price || 0),
      total: Number(item.total || item.total_price || 0),
    })),
  };

  printInvoiceEngine(invoiceData, language, companyName);
};
