import { printInvoiceEngine } from './printInvoiceEngine';
import type { InvoiceData, DocumentType } from './printInvoiceEngine';
import { getCachedCompanySettings } from './companySettings';

export interface PrintInvoiceOptions {
  companyName?: string;
  creatorName?: string;
  language?: string;
  docType?: DocumentType;
  layoutFormat?: 'A4' | 'THERMAL_80MM';
}

export const printInvoice = (
  sale: any,
  items: any[],
  companyNameOrOptions?: string | PrintInvoiceOptions,
  creatorNameParam: string = '',
  languageParam: string = 'ar'
) => {
  let options: PrintInvoiceOptions = {};
  if (typeof companyNameOrOptions === 'object') {
    options = companyNameOrOptions;
  } else {
    options = {
      companyName: companyNameOrOptions,
      creatorName: creatorNameParam,
      language: languageParam
    };
  }

  const language = options.language || languageParam || 'ar';
  const isAr = language === 'ar';
  const notSetLabel = isAr ? 'غير محدد' : 'Not Set';
  const companySettings = getCachedCompanySettings();

  // Determine subtotal, discount, tax, grand total defensively
  const subtotal = Number(
    sale.subtotal ?? 
    items.reduce((s, i) => s + (Number(i.total || i.total_price || (Number(i.quantity || 0) * Number(i.price || i.unit_price || 0))) || 0), 0)
  );
  const discount = Number(sale.discount || sale.discount_amount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number(sale.tax ?? sale.tax_amount ?? (taxableAmount * (companySettings.vatRate / 100)));
  const grandTotal = Number(sale.grand_total ?? sale.total_amount ?? (taxableAmount + tax));

  const docType: DocumentType = options.docType || (
    sale.status === 'DRAFT' ? 'QUOTATION' : 
    sale.status === 'RETURNED' ? 'CREDIT_NOTE' : 
    'TAX_INVOICE'
  );

  const invoiceData: InvoiceData = {
    type: docType,
    invoiceNumber: sale.order_number || sale.invoice_number || `#${sale.id?.slice(0, 8).toUpperCase()}`,
    date: sale.order_date || sale.created_at || new Date().toISOString(),
    supplyDate: sale.supply_date || sale.order_date || sale.created_at,
    entityName: sale.customer?.name || sale.customer_name || (isAr ? 'عميل نقدي' : 'Cash Customer'),
    entityPhone: sale.customer?.mobile || sale.customer?.phone,
    entityAddress: sale.customer?.address,
    entityTaxNumber: sale.customer?.tax_number,
    warehouseName: sale.warehouse?.name,
    paymentMethod: sale.payment_method ? (sale.payment_method === 'cash' ? (isAr ? 'نقدي' : 'Cash') : sale.payment_method === 'card' ? (isAr ? 'شبكة / بطاقة' : 'Card') : sale.payment_method) : (isAr ? 'نقدي' : 'Cash'),
    status: sale.status,
    creatorName: options.creatorName || sale.created_by_name || sale.creator?.name,
    notes: sale.notes,
    subtotal: subtotal,
    discount: discount,
    tax: tax,
    grandTotal: grandTotal,
    layoutFormat: options.layoutFormat || (companySettings.thermalPrinting ? 'THERMAL_80MM' : 'A4'),
    items: items.map(item => ({
      productName: item.product?.name || item.product_name || (isAr ? 'صنف غير محدد' : 'General Item'),
      productCode: item.product?.product_code || item.product?.code || item.product_code || item.product?.sku || '-',
      categoryName: item.product?.category?.name || notSetLabel,
      subcategoryName: item.product?.brand?.name || notSetLabel,
      quantity: Number(item.quantity || 0),
      unitCode: item.unit?.code || item.unit?.name || (isAr ? 'وحدة' : 'Unit'),
      price: Number(item.selling_price || item.unit_price || item.price || 0),
      discount: Number(item.discount || 0),
      taxAmount: Number(item.tax || 0),
      total: Number(item.total || item.total_price || (Number(item.quantity || 0) * Number(item.selling_price || item.unit_price || item.price || 0))),
    })),
  };

  printInvoiceEngine(invoiceData, language, options.companyName);
};
