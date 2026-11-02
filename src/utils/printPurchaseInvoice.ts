import { printInvoiceEngine } from './printInvoiceEngine';
import type { InvoiceData, DocumentType } from './printInvoiceEngine';
import { getCachedCompanySettings } from './companySettings';

export interface PrintPurchaseOptions {
  companyName?: string;
  creatorName?: string;
  language?: string;
  docType?: DocumentType;
  layoutFormat?: 'A4' | 'THERMAL_80MM';
}

export const printPurchaseInvoice = (
  purchase: any,
  items: any[],
  languageOrOptions?: string | PrintPurchaseOptions,
  companyNameParam?: string
) => {
  let options: PrintPurchaseOptions = {};
  if (typeof languageOrOptions === 'object') {
    options = languageOrOptions;
  } else {
    options = {
      language: languageOrOptions || 'ar',
      companyName: companyNameParam
    };
  }

  const language = options.language || 'ar';
  const isAr = language === 'ar';
  const notSetLabel = isAr ? 'غير محدد' : 'Not Set';
  const companySettings = getCachedCompanySettings();

  const subtotal = Number(
    purchase.subtotal ?? 
    items.reduce((sum, item) => sum + (Number(item.total) || (Number(item.quantity || 0) * Number(item.purchase_price || 0)) || 0), 0)
  );
  const discount = Number(purchase.discount_amount || purchase.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number(purchase.tax_amount ?? purchase.tax ?? (taxableAmount * (companySettings.vatRate / 100)));
  const grandTotal = Number(purchase.grand_total || (taxableAmount + tax));

  const docType: DocumentType = options.docType || (
    purchase.status === 'RECEIVED' ? 'PURCHASE_INVOICE' : 
    purchase.status === 'RETURNED' ? 'DEBIT_NOTE' : 
    'PURCHASE_ORDER'
  );

  const invoiceData: InvoiceData = {
    type: docType,
    invoiceNumber: purchase.invoice_number || purchase.purchase_number || `#${purchase.id?.slice(0, 8).toUpperCase()}`,
    date: purchase.purchase_date || purchase.created_at || new Date().toISOString(),
    supplyDate: purchase.expected_delivery_date || purchase.purchase_date || purchase.created_at,
    entityName: purchase.supplier?.name || (isAr ? 'مورد غير محدد' : 'Not Specified'),
    entityPhone: purchase.supplier?.phone,
    entityAddress: purchase.supplier?.address,
    entityTaxNumber: purchase.supplier?.tax_number,
    warehouseName: purchase.warehouse?.name,
    status: purchase.status,
    notes: purchase.notes,
    creatorName: options.creatorName || purchase.created_by_name,
    subtotal: subtotal,
    discount: discount,
    tax: tax,
    grandTotal: grandTotal,
    layoutFormat: options.layoutFormat || 'A4',
    items: items.map(item => ({
      productName: item.product?.name || item.product_name || (isAr ? 'صنف غير محدد' : 'General Item'),
      productCode: item.product?.product_code || item.product?.code || item.product_code || '-',
      categoryName: item.product?.category?.name || notSetLabel,
      subcategoryName: item.product?.brand?.name || notSetLabel,
      quantity: Number(item.quantity || 0),
      unitCode: item.unit?.code || item.unit?.name || (isAr ? 'وحدة' : 'Unit'),
      price: Number(item.purchase_price || 0),
      discount: Number(item.discount || 0),
      taxAmount: Number(item.tax || 0),
      total: Number(item.total || (Number(item.quantity || 0) * Number(item.purchase_price || 0))),
    })),
  };

  printInvoiceEngine(invoiceData, language, options.companyName);
};
