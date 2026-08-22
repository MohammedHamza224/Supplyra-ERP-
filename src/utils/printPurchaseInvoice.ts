import { printInvoiceEngine } from './printInvoiceEngine';
import type { InvoiceData } from './printInvoiceEngine';

export const printPurchaseInvoice = (
  purchase: any,
  items: any[],
  language: string = 'ar',
  companyName: string = 'SUPPLYRA'
) => {
  const notSetLabel = language === 'ar' ? 'غير محدد' : 'Not Set';

  const invoiceData: InvoiceData = {
    type: 'PURCHASE',
    invoiceNumber: purchase.invoice_number || purchase.purchase_number || `#${purchase.id?.slice(0,8).toUpperCase()}`,
    date: purchase.purchase_date || purchase.created_at,
    entityName: purchase.supplier?.name || (language === 'ar' ? 'غير محدد' : 'Not Specified'),
    entityPhone: purchase.supplier?.phone,
    entityAddress: purchase.supplier?.address,
    entityTaxNumber: purchase.supplier?.tax_number,
    warehouseName: purchase.warehouse?.name,
    status: purchase.status,
    notes: purchase.notes,
    subtotal: items.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    discount: Number(purchase.discount_amount || purchase.discount || 0),
    tax: Number(purchase.tax_amount || purchase.tax || 0),
    grandTotal: Number(purchase.grand_total || 0),
    items: items.map(item => ({
      productName: item.product?.name || (language === 'ar' ? 'منتج غير معروف' : 'Unknown Product'),
      productCode: item.product?.product_code || item.product?.code,
      categoryName: item.product?.category?.name || notSetLabel,
      subcategoryName: item.product?.brand?.name || notSetLabel,
      quantity: item.quantity || 0,
      unitCode: item.unit?.code || item.unit?.name || (language === 'ar' ? 'وحدة' : 'Unit'),
      price: Number(item.purchase_price || 0),
      total: Number(item.total || 0),
    })),
  };

  printInvoiceEngine(invoiceData, language, companyName);
};
