export interface InvoiceData {
  type: 'PURCHASE' | 'SALES';
  invoiceNumber: string;
  date: string;
  entityName: string; // Supplier name for Purchase, Customer name for Sales
  entityPhone?: string;
  entityAddress?: string;
  entityTaxNumber?: string;
  warehouseName?: string;
  status?: string;
  creatorName?: string;
  subtotal: number;
  discount?: number;
  tax?: number;
  grandTotal: number;
  notes?: string;
  items: Array<{
    productName: string;
    productCode?: string;
    categoryName?: string;
    subcategoryName?: string;
    quantity: number;
    unitCode?: string;
    price: number;
    total: number;
  }>;
}

export const printInvoiceEngine = (
  invoice: InvoiceData,
  language: string = 'ar',
  companyName: string = 'SUPPLYRA'
) => {
  const isAr = language === 'ar';
  const isPurchase = invoice.type === 'PURCHASE';

  // Create isolated print iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const notSetLabel = isAr ? 'غير محدد' : 'Not Set';
  const currencyLabel = isAr ? 'ر.س' : 'SAR';

  const invoiceTitle = isPurchase
    ? (isAr ? 'فاتورة شراء' : 'Purchase Invoice')
    : (isAr ? 'فاتورة مبيعات' : 'Sales Invoice');

  const entityTitle = isPurchase
    ? (isAr ? 'المورد:' : 'Supplier:')
    : (isAr ? 'العميل:' : 'Customer:');

  const priceTitle = isPurchase
    ? (isAr ? 'سعر الشراء' : 'Purchase Price')
    : (isAr ? 'سعر البيع' : 'Selling Price');

  const formattedDate = invoice.date
    ? new Date(invoice.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      })
    : '-';

  const subtotal = invoice.subtotal || invoice.items.reduce((s, i) => s + (i.total || 0), 0);
  const discount = invoice.discount || 0;
  const tax = invoice.tax || 0;
  const grandTotal = invoice.grandTotal || (subtotal - discount + tax);

  const html = `
    <!DOCTYPE html>
    <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8" />
        <title>${invoiceTitle} - ${invoice.invoiceNumber}</title>
        <style>
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { margin: 0; padding: 0; background: #fff !important; }
            .no-print { display: none !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: ${isAr ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Inter', system-ui, sans-serif"};
            color: #0f172a;
            line-height: 1.4;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .header-brand h1 {
            margin: 0 0 2px 0;
            font-size: 24px;
            font-weight: 700;
            color: #047857;
            letter-spacing: 0.5px;
          }
          .header-brand p {
            margin: 0;
            font-size: 12px;
            color: #64748b;
          }
          .invoice-title {
            text-align: ${isAr ? 'left' : 'right'};
          }
          .invoice-title h2 {
            margin: 0 0 2px 0;
            font-size: 18px;
            color: #0f172a;
          }
          .invoice-title span {
            font-size: 13px;
            font-weight: 600;
            color: #047857;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 18px;
            font-size: 12px;
          }
          .info-block p {
            margin: 2px 0;
          }
          .info-block strong {
            color: #475569;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 12px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            border-bottom: 2px solid #cbd5e1;
            padding: 8px 10px;
            text-align: ${isAr ? 'right' : 'left'};
            font-weight: 600;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 10px;
            color: #1e293b;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .text-align-end {
            text-align: ${isAr ? 'left' : 'right'};
          }
          .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
          }
          .summary-table {
            width: 260px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 12px;
            font-size: 12px;
            border-bottom: 1px solid #f1f5f9;
          }
          .summary-row.total {
            font-size: 14px;
            font-weight: 700;
            background: #f0fdf4;
            color: #047857;
            border-bottom: none;
            border-top: 2px solid #047857;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-brand">
            <h1>${companyName}</h1>
            <p>${isAr ? 'نظام إدارة التوزيع وسلسلة التوريد' : 'Food Products Distribution & Supply Chain ERP'}</p>
          </div>
          <div class="invoice-title">
            <h2>${invoiceTitle}</h2>
            <span>${invoice.invoiceNumber}</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <p><strong>${entityTitle}</strong> ${invoice.entityName || (isAr ? 'عميل نقدي' : 'Walk-in')}</p>
            ${invoice.entityPhone ? `<p><strong>${isAr ? 'الهاتف:' : 'Phone:'}</strong> ${invoice.entityPhone}</p>` : ''}
            ${invoice.entityAddress ? `<p><strong>${isAr ? 'العنوان:' : 'Address:'}</strong> ${invoice.entityAddress}</p>` : ''}
            ${invoice.entityTaxNumber ? `<p><strong>${isAr ? 'الرقم الضريبي:' : 'Tax No:'}</strong> ${invoice.entityTaxNumber}</p>` : ''}
          </div>
          <div class="info-block">
            <p><strong>${isAr ? 'التاريخ:' : 'Date:'}</strong> ${formattedDate}</p>
            ${invoice.warehouseName ? `<p><strong>${isAr ? 'المستودع:' : 'Warehouse:'}</strong> ${invoice.warehouseName}</p>` : ''}
            ${invoice.status ? `<p><strong>${isAr ? 'الحالة:' : 'Status:'}</strong> ${invoice.status}</p>` : ''}
            ${invoice.creatorName ? `<p><strong>${isAr ? 'المستخدم:' : 'User:'}</strong> ${invoice.creatorName}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>${isAr ? 'المنتج' : 'Product'}</th>
              <th>${isAr ? 'الفئة' : 'Category'}</th>
              <th>${isAr ? 'الفئة الفرعية' : 'Subcategory'}</th>
              <th style="text-align: center;">${isAr ? 'الكمية' : 'Qty'}</th>
              <th>${isAr ? 'الوحدة' : 'Unit'}</th>
              <th class="text-align-end">${priceTitle}</th>
              <th class="text-align-end">${isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item, idx) => {
              const pName = item.productName || (isAr ? 'منتج غير معروف' : 'Unknown Product');
              const pCode = item.productCode ? `(${item.productCode})` : '';
              const catName = item.categoryName || notSetLabel;
              const subCatName = item.subcategoryName || notSetLabel;
              const unit = item.unitCode || (isAr ? 'وحدة' : 'Unit');
              const qty = item.quantity || 0;
              const price = Number(item.price || 0).toLocaleString(isAr ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 });
              const total = Number(item.total || 0).toLocaleString(isAr ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 });

              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${pName}</strong> ${pCode}</td>
                  <td>${catName}</td>
                  <td>${subCatName}</td>
                  <td style="text-align: center;">${qty}</td>
                  <td>${unit}</td>
                  <td class="text-align-end">${price} ${currencyLabel}</td>
                  <td class="text-align-end"><strong>${total} ${currencyLabel}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-table">
            <div class="summary-row">
              <span>${isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
              <span>${subtotal.toLocaleString(isAr ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 })} ${currencyLabel}</span>
            </div>
            ${discount > 0 ? `
              <div class="summary-row">
                <span>${isAr ? 'الخصم:' : 'Discount:'}</span>
                <span>-${discount.toLocaleString(isAr ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 })} ${currencyLabel}</span>
              </div>
            ` : ''}
            ${tax > 0 ? `
              <div class="summary-row">
                <span>${isAr ? 'الضريبة:' : 'Tax/VAT:'}</span>
                <span>${tax.toLocaleString(isAr ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 })} ${currencyLabel}</span>
              </div>
            ` : ''}
            <div class="summary-row total">
              <span>${isAr ? 'الإجمالي الكلي:' : 'Grand Total:'}</span>
              <span>${grandTotal.toLocaleString(isAr ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 })} ${currencyLabel}</span>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
          <div style="margin-top: 16px; padding: 10px 14px; background: #fffbebfb; border: 1px solid #fef08a; border-radius: 6px; font-size: 12px;">
            <strong>${isAr ? 'ملاحظات:' : 'Notes:'}</strong> ${invoice.notes}
          </div>
        ` : ''}

        <div class="footer">
          <p>${isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
          <p style="font-size: 10px; margin-top: 3px;">${isAr ? 'تم الطباعة في:' : 'Printed on:'} ${new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US')}</p>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 250);
};
