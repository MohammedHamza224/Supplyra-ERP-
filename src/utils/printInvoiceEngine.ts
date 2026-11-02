import { tafqeet } from './tafqeet';
import { generateZatcaTlvBase64, generateQrSvg } from './zatcaQR';
import { getCachedCompanySettings, type CompanySettings } from './companySettings';

export type DocumentType = 
  | 'TAX_INVOICE' 
  | 'SIMPLIFIED_INVOICE' 
  | 'SALES' 
  | 'PURCHASE' 
  | 'PURCHASE_ORDER' 
  | 'PURCHASE_INVOICE'
  | 'QUOTATION' 
  | 'SALES_ORDER' 
  | 'DELIVERY_NOTE' 
  | 'CREDIT_NOTE' 
  | 'DEBIT_NOTE' 
  | 'STOCK_ISSUE' 
  | 'STOCK_RECEIPT' 
  | 'STOCK_TRANSFER' 
  | 'STOCK_REPORT' 
  | 'PAYMENT_VOUCHER' 
  | 'RECEIPT_VOUCHER' 
  | 'ACCOUNT_STATEMENT';

export interface DocumentItem {
  productName: string;
  productCode?: string;
  categoryName?: string;
  subcategoryName?: string;
  quantity: number;
  unitCode?: string;
  price: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface InvoiceData {
  type: DocumentType;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  supplyDate?: string;
  entityName: string; // Customer or Supplier Name
  entityPhone?: string;
  entityAddress?: string;
  entityTaxNumber?: string;
  entityCommercialRegister?: string;
  warehouseName?: string;
  destinationWarehouse?: string;
  paymentMethod?: string;
  status?: string;
  creatorName?: string;
  subtotal: number;
  discount?: number;
  tax?: number;
  grandTotal: number;
  paidAmount?: number;
  remainingAmount?: number;
  notes?: string;
  terms?: string;
  items: DocumentItem[];
  companyOverride?: Partial<CompanySettings>;
  layoutFormat?: 'A4' | 'THERMAL_80MM';
}

/**
 * Maps document type to bilingual titles
 */
function getDocumentTitle(type: DocumentType, isAr: boolean): { title: string; subtitle: string } {
  switch (type) {
    case 'TAX_INVOICE':
      return {
        title: isAr ? 'فاتورة ضريبية' : 'TAX INVOICE',
        subtitle: isAr ? 'فاتورة ضريبية رسمية معتمدة' : 'Official Standard Tax Invoice'
      };
    case 'SIMPLIFIED_INVOICE':
      return {
        title: isAr ? 'فاتورة ضريبية مبسطة' : 'SIMPLIFIED TAX INVOICE',
        subtitle: isAr ? 'نقاط البيع والمبيعات النقدية' : 'POS Cash Sales Invoice'
      };
    case 'SALES':
      return {
        title: isAr ? 'فاتورة مبيعات' : 'SALES INVOICE',
        subtitle: isAr ? 'فاتورة بيع بضاعة' : 'Goods Sales Invoice'
      };
    case 'QUOTATION':
      return {
        title: isAr ? 'عرض أسعار' : 'PRICE QUOTATION',
        subtitle: isAr ? 'فاتورة شكلية ومقايسة أسعار' : 'Proforma Invoice & Price Estimate'
      };
    case 'SALES_ORDER':
      return {
        title: isAr ? 'أمر بيع وتوريد' : 'SALES ORDER',
        subtitle: isAr ? 'طلب بيع معتمد' : 'Authorized Sales Order'
      };
    case 'DELIVERY_NOTE':
      return {
        title: isAr ? 'إذن تسليم بضاعة' : 'DELIVERY NOTE',
        subtitle: isAr ? 'إشعار شحن واستلام مخزني' : 'Dispatch Advice / Waybill'
      };
    case 'CREDIT_NOTE':
      return {
        title: isAr ? 'إشعار دائن (مردودات مبيعات)' : 'CREDIT NOTE (Sales Return)',
        subtitle: isAr ? 'إشعار تسوية مردودات' : 'Sales Return Adjustment Note'
      };
    case 'PURCHASE':
    case 'PURCHASE_ORDER':
      return {
        title: isAr ? 'أمر شراء رسمي' : 'PURCHASE ORDER',
        subtitle: isAr ? 'أمر توريد وشراء بضاعة' : 'Official Purchase Order'
      };
    case 'DEBIT_NOTE':
      return {
        title: isAr ? 'إشعار مدين (مردودات مشتريات)' : 'DEBIT NOTE (Purchase Return)',
        subtitle: isAr ? 'إشعار إرجاع للمورد' : 'Supplier Return Adjustment'
      };
    case 'STOCK_ISSUE':
      return {
        title: isAr ? 'سند صرف مخزني' : 'STOCK ISSUE VOUCHER',
        subtitle: isAr ? 'إذن إخراج بضاعة من المستودع' : 'Goods Issue Requisition'
      };
    case 'STOCK_RECEIPT':
      return {
        title: isAr ? 'سند استلام مخزني' : 'STOCK RECEIPT VOUCHER',
        subtitle: isAr ? 'إذن إدخال بضاعة للمستودع' : 'Goods Receipt Voucher'
      };
    case 'STOCK_TRANSFER':
      return {
        title: isAr ? 'سند تحويل مخزني' : 'STOCK TRANSFER NOTE',
        subtitle: isAr ? 'نقل بضاعة بين المستودعات' : 'Inter-Warehouse Stock Transfer'
      };
    case 'STOCK_REPORT':
      return {
        title: isAr ? 'تقرير جرد وتقييم المخزون' : 'INVENTORY VALUATION REPORT',
        subtitle: isAr ? 'أرصدة ودفعات المستودعات' : 'Warehouse Stock & Batches'
      };
    case 'PAYMENT_VOUCHER':
      return {
        title: isAr ? 'سند صرف مالي' : 'PAYMENT VOUCHER',
        subtitle: isAr ? 'سند سداد نقدي / بنكي' : 'Payment Disbursal Voucher'
      };
    case 'RECEIPT_VOUCHER':
      return {
        title: isAr ? 'سند قبض مالي' : 'RECEIPT VOUCHER',
        subtitle: isAr ? 'سند تحصيل نقدي / بنكي' : 'Cash Receipt Voucher'
      };
    case 'ACCOUNT_STATEMENT':
      return {
        title: isAr ? 'كشف حساب مالي' : 'STATEMENT OF ACCOUNT',
        subtitle: isAr ? 'حركة المعاملات والأرصدة' : 'Transaction History & Balances'
      };
    default:
      return {
        title: isAr ? 'مستند مالي' : 'FINANCIAL DOCUMENT',
        subtitle: isAr ? 'Supplyra ERP' : 'Supplyra ERP'
      };
  }
}

/**
 * Universal Print Engine for Invoices, Orders, Receipts, and Reports
 */
export const printInvoiceEngine = (
  invoice: InvoiceData,
  language: string = 'ar',
  companyNameParam?: string
) => {
  const isAr = language === 'ar';
  const companySettings = {
    ...getCachedCompanySettings(),
    ...(invoice.companyOverride || {}),
    ...(companyNameParam && companyNameParam !== 'SUPPLYRA' ? { companyName: companyNameParam } : {})
  };

  const isThermal = invoice.layoutFormat === 'THERMAL_80MM' || (companySettings.thermalPrinting && invoice.type === 'SIMPLIFIED_INVOICE');
  const currencySymbol = isAr ? 'ر.س' : 'SAR';
  const docTitle = getDocumentTitle(invoice.type, isAr);

  // Financial calculations
  const subtotal = Number(invoice.subtotal || invoice.items.reduce((s, i) => s + (Number(i.total) || 0), 0));
  const discount = Number(invoice.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number(invoice.tax !== undefined ? invoice.tax : (taxableAmount * (companySettings.vatRate / 100)));
  const grandTotal = Number(invoice.grandTotal || (taxableAmount + tax));

  // Arabic / English Tafqeet
  const wordsTotal = tafqeet(grandTotal, { currency: 'SAR', language: isAr ? 'ar' : 'en' });

  // Dates
  const formattedDate = invoice.date ? new Date(invoice.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }) : new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US');

  const formattedTime = invoice.date ? new Date(invoice.date).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
    hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US');

  // ZATCA QR Code (Official TLV format)
  const isTaxDoc = ['TAX_INVOICE', 'SIMPLIFIED_INVOICE', 'SALES', 'CREDIT_NOTE', 'PURCHASE'].includes(invoice.type);
  let qrSvgString = '';
  if (companySettings.autoTaxQr && isTaxDoc) {
    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: companySettings.companyName,
      vatNumber: companySettings.taxNumber,
      timestamp: invoice.date || new Date().toISOString(),
      totalAmount: grandTotal,
      vatAmount: tax
    });
    qrSvgString = generateQrSvg(tlvBase64, isThermal ? 130 : 110);
  }

  // HTML Generation
  const htmlContent = isThermal 
    ? generateThermalReceiptHtml(invoice, companySettings, docTitle, isAr, currencySymbol, subtotal, discount, taxableAmount, tax, grandTotal, wordsTotal, formattedDate, formattedTime, qrSvgString)
    : generateA4InvoiceHtml(invoice, companySettings, docTitle, isAr, currencySymbol, subtotal, discount, taxableAmount, tax, grandTotal, wordsTotal, formattedDate, formattedTime, qrSvgString);

  // Execution: Isolated, resilient iframe print with safe cleanup
  executePrintHtml(htmlContent, `${docTitle.title} - ${invoice.invoiceNumber}`);
};

/**
 * Standard A4 Master Professional Invoice Template
 */
function generateA4InvoiceHtml(
  invoice: InvoiceData,
  company: CompanySettings,
  docTitle: { title: string; subtitle: string },
  isAr: boolean,
  currency: string,
  subtotal: number,
  discount: number,
  taxableAmount: number,
  tax: number,
  grandTotal: number,
  wordsTotal: string,
  formattedDate: string,
  formattedTime: string,
  qrSvgString: string
): string {
  const isPurchase = invoice.type.includes('PURCHASE') || invoice.type.includes('DEBIT');
  const entityLabel = isPurchase ? (isAr ? 'بيانات المورد' : 'Supplier Information') : (isAr ? 'بيانات العميل' : 'Customer Information');

  return `
<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${docTitle.title} - ${invoice.invoiceNumber}</title>
  <style>
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 10mm 14mm 10mm;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }

    * { box-sizing: border-box; }
    body {
      font-family: ${isAr ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Inter', system-ui, -apple-system, sans-serif"};
      color: #0f172a;
      line-height: 1.45;
      padding: 16px;
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      font-size: 11.5px;
    }

    /* Top Brand & Header Bar */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #047857;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .company-col {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .company-logo {
      width: 68px;
      height: 68px;
      object-fit: contain;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 4px;
    }
    .logo-monogram {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      background: linear-gradient(135deg, #047857, #10b981);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .company-details h1 {
      margin: 0 0 3px 0;
      font-size: 21px;
      font-weight: 800;
      color: #047857;
    }
    .company-details p {
      margin: 1px 0;
      font-size: 10.5px;
      color: #475569;
    }
    .company-meta-tags {
      margin-top: 5px;
      display: flex;
      gap: 12px;
      font-size: 10.5px;
      font-weight: 600;
      color: #1e293b;
    }

    /* Document Title Block */
    .title-block {
      text-align: ${isAr ? 'left' : 'right'};
    }
    .title-block .badge-title {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .title-block .doc-subtitle {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .doc-num {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
    }

    /* Information Panels Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 10px 14px;
      font-size: 11px;
    }
    .info-card h3 {
      margin: 0 0 6px 0;
      font-size: 11.5px;
      font-weight: 700;
      color: #047857;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
    }

    /* Line Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .items-table th {
      background-color: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      font-weight: 600;
      text-align: ${isAr ? 'right' : 'left'};
      border: 1px solid #0f172a;
    }
    .items-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .items-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .text-center { text-align: center !important; }
    .text-end { text-align: ${isAr ? 'left' : 'right'} !important; }

    /* Summary & QR Section */
    .summary-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
      break-inside: avoid;
    }
    .qr-tafqeet-col {
      flex: 1;
      display: flex;
      gap: 12px;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 10px 14px;
    }
    .qr-box {
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 3px;
    }
    .tafqeet-box {
      flex: 1;
      font-size: 10.5px;
    }
    .tafqeet-box strong {
      display: block;
      color: #047857;
      margin-bottom: 3px;
      font-size: 11px;
    }
    .tafqeet-text {
      background: #ffffff;
      padding: 6px 10px;
      border-radius: 5px;
      border: 1px dashed #cbd5e1;
      color: #1e293b;
      font-weight: 600;
      line-height: 1.4;
    }

    .summary-card {
      width: 290px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      overflow: hidden;
      background: #ffffff;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 5px 12px;
      font-size: 11px;
      border-bottom: 1px solid #f1f5f9;
    }
    .summary-line.grand {
      background: #ecfdf5;
      color: #047857;
      font-size: 13.5px;
      font-weight: 800;
      border-top: 2px solid #047857;
      border-bottom: none;
      padding: 8px 12px;
    }

    /* Notes & Terms */
    .terms-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 10px;
      color: #713f12;
      margin-bottom: 16px;
      break-inside: avoid;
    }

    /* Signatures Section */
    .signatures-block {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      break-inside: avoid;
    }
    .sig-col {
      width: 28%;
      text-align: center;
      font-size: 10.5px;
    }
    .sig-col .sig-title {
      font-weight: 700;
      color: #475569;
      margin-bottom: 40px;
    }
    .sig-col .sig-line {
      border-top: 1px dashed #94a3b8;
      padding-top: 4px;
      color: #64748b;
      font-size: 9.5px;
    }

    /* Footer */
    .doc-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <div class="invoice-header">
    <div class="company-col">
      ${company.logoUrl ? `
        <img class="company-logo" src="${company.logoUrl}" alt="Logo" onerror="this.style.display='none'" />
      ` : `
        <div class="logo-monogram">S</div>
      `}
      <div class="company-details">
        <h1>${company.companyName}</h1>
        <p>${company.tagline}</p>
        <p>${company.address} • هاتف: ${company.phone}</p>
        <div class="company-meta-tags">
          <span>الرقم الضريبي: <strong>${company.taxNumber}</strong></span>
          <span>السجل التجاري: <strong>${company.commercialRegister}</strong></span>
        </div>
      </div>
    </div>

    <div class="title-block">
      <div class="badge-title">${docTitle.title}</div>
      <div class="doc-subtitle">${docTitle.subtitle}</div>
      <div class="doc-num">${invoice.invoiceNumber}</div>
    </div>
  </div>

  <!-- Information Panels Grid -->
  <div class="info-grid">
    <div class="info-card">
      <h3>${entityLabel}</h3>
      <div class="info-row">
        <span class="info-label">${isAr ? 'الاسم:' : 'Name:'}</span>
        <span class="info-val">${invoice.entityName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</span>
      </div>
      ${invoice.entityTaxNumber ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'الرقم الضريبي:' : 'Tax No:'}</span>
          <span class="info-val">${invoice.entityTaxNumber}</span>
        </div>
      ` : ''}
      ${invoice.entityPhone ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'الهاتف:' : 'Phone:'}</span>
          <span class="info-val">${invoice.entityPhone}</span>
        </div>
      ` : ''}
      ${invoice.entityAddress ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'العنوان:' : 'Address:'}</span>
          <span class="info-val">${invoice.entityAddress}</span>
        </div>
      ` : ''}
    </div>

    <div class="info-card">
      <h3>${isAr ? 'بيانات المستند' : 'Document Details'}</h3>
      <div class="info-row">
        <span class="info-label">${isAr ? 'تاريخ الإصدار:' : 'Issue Date:'}</span>
        <span class="info-val">${formattedDate}</span>
      </div>
      ${invoice.supplyDate ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'تاريخ التوريد:' : 'Supply Date:'}</span>
          <span class="info-val">${new Date(invoice.supplyDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>
        </div>
      ` : ''}
      ${invoice.warehouseName ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'المستودع:' : 'Warehouse:'}</span>
          <span class="info-val">${invoice.warehouseName}</span>
        </div>
      ` : ''}
      ${invoice.paymentMethod ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'طريقة الدفع:' : 'Payment:'}</span>
          <span class="info-val">${invoice.paymentMethod}</span>
        </div>
      ` : ''}
      ${invoice.status ? `
        <div class="info-row">
          <span class="info-label">${isAr ? 'الحالة:' : 'Status:'}</span>
          <span class="info-val">${invoice.status}</span>
        </div>
      ` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 25px;" class="text-center">#</th>
        <th style="width: 100px;">${isAr ? 'الكود' : 'Code'}</th>
        <th>${isAr ? 'اسم الصنف والوصف' : 'Item Description'}</th>
        <th style="width: 60px;" class="text-center">${isAr ? 'الوحدة' : 'Unit'}</th>
        <th style="width: 50px;" class="text-center">${isAr ? 'الكمية' : 'Qty'}</th>
        <th style="width: 80px;" class="text-end">${isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
        ${discount > 0 ? `<th style="width: 65px;" class="text-end">${isAr ? 'خصم' : 'Disc.'}</th>` : ''}
        <th style="width: 70px;" class="text-end">${isAr ? 'الضريبة' : 'VAT (15%)'}</th>
        <th style="width: 95px;" class="text-end">${isAr ? 'الإجمالي الصافي' : 'Net Total'}</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, idx) => {
        const itemQty = Number(item.quantity || 0);
        const itemPrice = Number(item.price || 0);
        const itemDiscount = Number(item.discount || 0);
        const itemTaxable = Math.max(0, (itemQty * itemPrice) - itemDiscount);
        const itemTax = item.taxAmount !== undefined ? Number(item.taxAmount) : (itemTaxable * (company.vatRate / 100));
        const itemTotal = Number(item.total || (itemTaxable + itemTax));

        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: 600;">${item.productCode || '-'}</td>
            <td>
              <strong>${item.productName}</strong>
              ${item.categoryName ? `<span style="font-size: 9.5px; color: #64748b; display: block;">${item.categoryName}</span>` : ''}
            </td>
            <td class="text-center">${item.unitCode || (isAr ? 'وحدة' : 'Unit')}</td>
            <td class="text-center"><strong>${itemQty}</strong></td>
            <td class="text-end">${itemPrice.toFixed(2)}</td>
            ${discount > 0 ? `<td class="text-end text-danger">${itemDiscount > 0 ? `-${itemDiscount.toFixed(2)}` : '0.00'}</td>` : ''}
            <td class="text-end">${itemTax.toFixed(2)}</td>
            <td class="text-end"><strong>${itemTotal.toFixed(2)} ${currency}</strong></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- Summary & QR Code Section -->
  <div class="summary-container">
    <div class="qr-tafqeet-col">
      ${qrSvgString ? `<div class="qr-box">${qrSvgString}</div>` : ''}
      <div class="tafqeet-box">
        <strong>${isAr ? 'المبلغ المستحق كتابةً:' : 'Amount in Words:'}</strong>
        <div class="tafqeet-text">${wordsTotal}</div>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-line">
        <span>${isAr ? 'المجموع قبل الضريبة:' : 'Subtotal (Excl. VAT):'}</span>
        <strong>${subtotal.toFixed(2)} ${currency}</strong>
      </div>
      ${discount > 0 ? `
        <div class="summary-line">
          <span style="color: #dc2626;">${isAr ? 'إجمالي الخصم:' : 'Total Discount:'}</span>
          <strong style="color: #dc2626;">-${discount.toFixed(2)} ${currency}</strong>
        </div>
      ` : ''}
      <div class="summary-line">
        <span>${isAr ? 'الخاضع للضريبة:' : 'Taxable Amount:'}</span>
        <strong>${taxableAmount.toFixed(2)} ${currency}</strong>
      </div>
      <div class="summary-line">
        <span>${isAr ? `ضريبة القيمة المضافة (${company.vatRate}%):` : `VAT Total (${company.vatRate}%):`}</span>
        <strong>${tax.toFixed(2)} ${currency}</strong>
      </div>
      <div class="summary-line grand">
        <span>${isAr ? 'الإجمالي النهائي المطلوب:' : 'Grand Total (Incl. VAT):'}</span>
        <span>${grandTotal.toFixed(2)} ${currency}</span>
      </div>
    </div>
  </div>

  <!-- Terms & Notes -->
  ${(invoice.notes || company.invoiceFooter) ? `
    <div class="terms-box">
      <strong>${isAr ? 'ملاحظات وشروط:' : 'Terms & Conditions:'}</strong>
      ${invoice.notes ? `<p style="margin: 2px 0;">${invoice.notes}</p>` : ''}
      ${company.invoiceFooter ? `<p style="margin: 2px 0;">${company.invoiceFooter}</p>` : ''}
    </div>
  ` : ''}

  <!-- Signatures Block -->
  <div class="signatures-block">
    <div class="sig-col">
      <div class="sig-title">${isAr ? 'توقيع المستلم / العميل' : 'Receiver / Customer'}</div>
      <div class="sig-line">${isAr ? 'الاسم والتوقيع' : 'Name & Signature'}</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">${isAr ? 'مسؤول المبيعات / المحاسب' : 'Accountant / Sales Rep'}</div>
      <div class="sig-line">${invoice.creatorName || (isAr ? 'المسؤول المعتمد' : 'Authorized Signatory')}</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">${isAr ? 'الختم الرسمي' : 'Official Seal'}</div>
      <div class="sig-line">${company.companyName}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <span>${isAr ? 'تم استخراج المستند بواسطة Supplyra ERP' : 'Generated via Supplyra ERP'} • ${formattedDate} ${formattedTime}</span>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 80mm Thermal Receipt Template (For Retail / POS / Cashier Printers)
 */
function generateThermalReceiptHtml(
  invoice: InvoiceData,
  company: CompanySettings,
  docTitle: { title: string; subtitle: string },
  isAr: boolean,
  currency: string,
  subtotal: number,
  discount: number,
  taxableAmount: number,
  tax: number,
  grandTotal: number,
  wordsTotal: string,
  formattedDate: string,
  formattedTime: string,
  qrSvgString: string
): string {
  return `
<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${docTitle.title} - ${invoice.invoiceNumber}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 2mm 3mm;
      }
      body {
        margin: 0 !important;
        padding: 4px !important;
        background: #ffffff !important;
      }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace, 'Segoe UI', sans-serif;
      color: #000000;
      width: 76mm;
      margin: 0 auto;
      padding: 6px;
      font-size: 11px;
      line-height: 1.35;
      background: #ffffff;
    }
    .text-center { text-align: center; }
    .text-end { text-align: ${isAr ? 'left' : 'right'}; }
    .thermal-header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .thermal-header h2 {
      margin: 0 0 2px 0;
      font-size: 15px;
      font-weight: 800;
    }
    .thermal-header p {
      margin: 1px 0;
      font-size: 10px;
    }
    .doc-type-badge {
      font-size: 12px;
      font-weight: 700;
      border: 1px solid #000;
      padding: 2px 4px;
      margin: 4px 0;
      display: inline-block;
    }
    .meta-line {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 1px 0;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      font-size: 10px;
    }
    .receipt-table th {
      padding: 3px 1px;
      border-bottom: 1px solid #000;
    }
    .receipt-table td {
      padding: 3px 1px;
    }
    .totals-area {
      border-bottom: 1px dashed #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
      font-size: 10.5px;
    }
    .total-row.grand {
      font-size: 13px;
      font-weight: 900;
      border-top: 1px solid #000;
      padding-top: 3px;
      margin-top: 3px;
    }
    .qr-center {
      text-align: center;
      margin: 8px 0;
    }
    .receipt-footer {
      text-align: center;
      font-size: 9.5px;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="thermal-header">
    <h2>${company.companyName}</h2>
    <p>${company.address}</p>
    <p>هاتف: ${company.phone}</p>
    <p>الرقم الضريبي: ${company.taxNumber}</p>
    <div class="doc-type-badge">${docTitle.title}</div>
    <div style="font-size: 11px; font-weight: 700;">#${invoice.invoiceNumber}</div>
  </div>

  <div class="meta-line">
    <span>التاريخ: ${formattedDate}</span>
    <span>الوقت: ${formattedTime}</span>
  </div>
  <div class="meta-line">
    <span>العميل: ${invoice.entityName || 'نقدي'}</span>
    ${invoice.creatorName ? `<span>الكاشير: ${invoice.creatorName}</span>` : ''}
  </div>

  <table class="receipt-table">
    <thead>
      <tr>
        <th style="text-align: ${isAr ? 'right' : 'left'};">الصنف</th>
        <th class="text-center">الكمية</th>
        <th class="text-end">السعر</th>
        <th class="text-end">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.productName}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-end">${Number(item.price || 0).toFixed(2)}</td>
          <td class="text-end"><strong>${Number(item.total || 0).toFixed(2)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-area">
    <div class="total-row">
      <span>المجموع قبل الضريبة:</span>
      <span>${subtotal.toFixed(2)} ${currency}</span>
    </div>
    ${discount > 0 ? `
      <div class="total-row">
        <span>الخصم:</span>
        <span>-${discount.toFixed(2)} ${currency}</span>
      </div>
    ` : ''}
    <div class="total-row">
      <span>ضريبة القيمة المضافة (${company.vatRate}%):</span>
      <span>${tax.toFixed(2)} ${currency}</span>
    </div>
    <div class="total-row grand">
      <span>الإجمالي النهائي:</span>
      <span>${grandTotal.toFixed(2)} ${currency}</span>
    </div>
  </div>

  <div style="font-size: 9px; text-align: center; margin: 4px 0; font-weight: 600;">
    ${wordsTotal}
  </div>

  ${qrSvgString ? `
    <div class="qr-center">
      ${qrSvgString}
    </div>
  ` : ''}

  <div class="receipt-footer">
    <p>${company.invoiceFooter || 'شكراً لزيارتكم'}</p>
    <p>Supplyra ERP</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Executes printing safely via an isolated iframe with a window fallback
 */
function executePrintHtml(html: string, pageTitle: string) {
  try {
    // 1. Clean up any existing print iframes
    const existingIframe = document.getElementById('supplyra-print-iframe');
    if (existingIframe && existingIframe.parentNode) {
      existingIframe.parentNode.removeChild(existingIframe);
    }

    // 2. Create high-reliability print iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'supplyra-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('Cannot access print iframe document');

    doc.open();
    doc.write(html);
    doc.close();

    // 3. Trigger print once loaded
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to window print:', e);
          openPrintWindowFallback(html, pageTitle);
        }
      }, 150);
    };

    // Fallback if onload doesn't fire within 500ms
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (_) {}
    }, 500);

  } catch (err) {
    console.error('Print iframe failed, opening new window fallback:', err);
    openPrintWindowFallback(html, pageTitle);
  }
}

/**
 * Fallback to standard popup window print if iframe is blocked by strict browser policy
 */
function openPrintWindowFallback(html: string, pageTitle: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  } else {
    alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتتمكن من معاينة وطباعة الفاتورة.');
  }
}
