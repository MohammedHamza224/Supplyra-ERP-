import React, { useState } from 'react';
import { 
  X, Printer, FileText, Receipt, Globe, Check, Eye, Download, 
  Building2, QrCode, FileCheck, Layers, Sparkles 
} from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';
import { printInvoiceEngine, type InvoiceData, type DocumentType } from '../../utils/printInvoiceEngine';
import { getCachedCompanySettings } from '../../utils/companySettings';
import { tafqeet } from '../../utils/tafqeet';
import { generateZatcaTlvBase64, generateQrSvg } from '../../utils/zatcaQR';

interface DocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
  defaultFormat?: 'A4' | 'THERMAL_80MM';
}

export const DocumentPrintModal: React.FC<DocumentPrintModalProps> = ({
  isOpen,
  onClose,
  data,
  defaultFormat = 'A4'
}) => {
  const { language } = useTranslation();
  const [docLanguage, setDocLanguage] = useState<'ar' | 'en'>(language === 'en' ? 'en' : 'ar');
  const [format, setFormat] = useState<'A4' | 'THERMAL_80MM'>(defaultFormat);
  const [docType, setDocType] = useState<DocumentType>(data.type || 'TAX_INVOICE');
  const [printing, setPrinting] = useState(false);

  if (!isOpen) return null;

  const isAr = docLanguage === 'ar';
  const company = {
    ...getCachedCompanySettings(),
    ...(data.companyOverride || {})
  };

  const currency = isAr ? 'ر.س' : 'SAR';

  // Robust item line totals & subtotal calculation
  const computedItems = (data.items || []).map((item, idx) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const disc = Number(item.discount || 0);
    const lineSubtotal = Math.max(0, (qty * price) - disc);
    const taxAmt = item.taxAmount !== undefined && Number(item.taxAmount) > 0 
      ? Number(item.taxAmount) 
      : Number((lineSubtotal * (company.vatRate / 100)).toFixed(2));
    const rawTot = Number(item.total || 0);
    const lineTotal = rawTot > 0 ? rawTot : lineSubtotal;

    return {
      ...item,
      quantity: qty,
      price: price,
      discount: disc,
      taxAmount: taxAmt,
      computedSubtotal: lineSubtotal,
      computedTotal: lineTotal
    };
  });

  const itemsSubtotalSum = computedItems.reduce((acc, it) => acc + it.computedSubtotal, 0);
  const rawSubtotal = Number(data.subtotal || 0);
  const subtotal = rawSubtotal > 0 ? rawSubtotal : (itemsSubtotalSum > 0 ? itemsSubtotalSum : Number(data.grandTotal || 0));

  const rawDiscount = Number(data.discount || 0);
  const rawGrandTotal = Number(data.grandTotal || 0);
  const calculatedTax = Number(data.tax !== undefined && data.tax !== null && Number(data.tax) > 0 
    ? data.tax 
    : (Math.max(0, subtotal - rawDiscount) * (company.vatRate / 100)));

  // Implied discount detection: if subtotal + tax > grandTotal, deduce applied discount
  const impliedDiscount = (rawGrandTotal > 0 && (subtotal + calculatedTax - rawGrandTotal) > 0.05)
    ? Math.round((subtotal + calculatedTax - rawGrandTotal) * 100) / 100
    : 0;

  const discount = rawDiscount > 0 ? rawDiscount : impliedDiscount;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number(data.tax !== undefined && data.tax !== null && Number(data.tax) > 0 
    ? data.tax 
    : (taxableAmount * (company.vatRate / 100)));
  const grandTotal = rawGrandTotal > 0 ? rawGrandTotal : (taxableAmount + tax);

  const wordsTotal = tafqeet(grandTotal, { currency: 'SAR', language: docLanguage });

  // Standard consistent date format: YYYY/MM/DD
  const formatStandardDate = (dInput: any) => {
    if (!dInput) {
      const now = new Date();
      return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    }
    const d = new Date(dInput);
    if (isNaN(d.getTime())) return String(dInput).split('T')[0];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  };

  const formattedDate = formatStandardDate(data.date);

  // ZATCA QR Code (Official TLV Format)
  let qrSvgString = '';
  if (company.autoTaxQr) {
    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: company.companyName,
      vatNumber: company.taxNumber,
      timestamp: data.date || new Date().toISOString(),
      totalAmount: grandTotal,
      vatAmount: tax
    });
    qrSvgString = generateQrSvg(tlvBase64, format === 'THERMAL_80MM' ? 120 : 96);
  }

  const handlePrint = () => {
    setPrinting(true);
    const invoiceToPrint: InvoiceData = {
      ...data,
      subtotal,
      discount,
      tax,
      grandTotal,
      items: computedItems.map(it => ({
        ...it,
        total: it.computedTotal
      })),
      type: docType,
      layoutFormat: format
    };
    printInvoiceEngine(invoiceToPrint, docLanguage, company.companyName);
    setTimeout(() => setPrinting(false), 800);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: isAr ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Inter', system-ui, sans-serif"
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '1020px',
          height: 'min(94vh, 920px)',
          backgroundColor: '#0f172a',
          borderRadius: '14px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #334155'
        }}
      >
        {/* Top Control Bar */}
        <div 
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)' }}>
              <Printer size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                {isAr ? 'معاينة وطباعة الفاتورة والمستند' : 'Document Print Preview'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                #{data.invoiceNumber} • {company.companyName}
              </span>
            </div>
          </div>

          {/* Quick Customization Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Format Toggle (A4 vs Thermal) */}
            <div style={{ display: 'inline-flex', backgroundColor: '#0f172a', borderRadius: '8px', padding: '3px', border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => setFormat('A4')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: format === 'A4' ? '#059669' : 'transparent',
                  color: format === 'A4' ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={15} />
                <span>A4</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('THERMAL_80MM')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: format === 'THERMAL_80MM' ? '#059669' : 'transparent',
                  color: format === 'THERMAL_80MM' ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={15} />
                <span>{isAr ? 'حراري 80مم' : 'Thermal 80mm'}</span>
              </button>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setDocLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#f8fafc'
              }}
              title={isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
            >
              <Globe size={15} />
              <span>{docLanguage === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Print Now Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: printing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              <Printer size={17} />
              <span>{printing ? (isAr ? 'جاري الإرسال...' : 'Printing...') : (isAr ? 'طباعة الفاتورة' : 'Print Invoice')}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                transition: 'all 0.15s ease'
              }}
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Live Document Preview Canvas Area */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 16px',
            backgroundColor: '#0b1120',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {format === 'A4' ? (
            /* A4 Document Preview Card */
            <div 
              style={{
                width: '100%',
                maxWidth: '820px',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5), 0 3px 10px rgba(0,0,0,0.15)',
                padding: '36px 40px',
                color: '#0f172a',
                fontSize: '11.5px',
                lineHeight: 1.45,
                direction: isAr ? 'rtl' : 'ltr'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2.5px solid #047857', paddingBottom: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'linear-gradient(135deg, #047857, #10b981)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>S</div>
                  )}
                  <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 3px 0', color: '#047857' }}>{company.companyName}</h1>
                    <p style={{ margin: '1px 0', fontSize: '10.5px', color: '#475569' }}>{company.tagline}</p>
                    <p style={{ margin: '1px 0', fontSize: '10px', color: '#64748b' }}>{company.address} • هاتف: {company.phone}</p>
                    <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 600, color: '#1e293b' }}>
                      الرقم الضريبي: <strong>{company.taxNumber}</strong> • السجل التجاري: <strong>{company.commercialRegister}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <div style={{ display: 'inline-block', backgroundColor: '#ecfdf5', color: '#047857', border: '1.5px solid #059669', padding: '4px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>
                    {isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{data.invoiceNumber}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '14px', marginBottom: '18px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px' }}>
                    {isAr ? 'بيانات العميل / الطرف الآخر' : 'Customer Information'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'الاسم:' : 'Name:'}</span>
                    <strong style={{ color: '#0f172a' }}>{data.entityName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</strong>
                  </div>
                  {data.entityTaxNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الرقم الضريبي:' : 'Tax No:'}</span>
                      <strong style={{ color: '#0f172a' }}>{data.entityTaxNumber}</strong>
                    </div>
                  )}
                  {data.entityPhone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الهاتف:' : 'Phone:'}</span>
                      <span>{data.entityPhone}</span>
                    </div>
                  )}
                  {data.entityAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'العنوان:' : 'Address:'}</span>
                      <span>{data.entityAddress}</span>
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px' }}>
                    {isAr ? 'بيانات المستند' : 'Document Details'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'تاريخ الإصدار:' : 'Issue Date:'}</span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '11px' }}>{formattedDate}</strong>
                  </div>
                  {data.warehouseName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'المستودع:' : 'Warehouse:'}</span>
                      <span>{data.warehouseName}</span>
                    </div>
                  )}
                  {data.paymentMethod && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'طريقة الدفع:' : 'Payment:'}</span>
                      <span style={{ fontWeight: 600 }}>{data.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '8px 8px', textAlign: 'center', width: '28px' }}>#</th>
                    <th style={{ padding: '8px 8px', width: '90px', textAlign: 'center' }}>{isAr ? 'الكود' : 'Code'}</th>
                    <th style={{ padding: '8px 10px', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'اسم الصنف والوصف' : 'Item Description'}</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', width: '55px' }}>{isAr ? 'الكمية' : 'Qty'}</th>
                    <th style={{ padding: '8px 10px', textAlign: isAr ? 'left' : 'right', width: '80px' }}>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th style={{ padding: '8px 10px', textAlign: isAr ? 'left' : 'right', width: '75px' }}>{isAr ? 'الضريبة (15%)' : 'VAT (15%)'}</th>
                    <th style={{ padding: '8px 10px', textAlign: isAr ? 'left' : 'right', width: '95px' }}>{isAr ? 'المجموع' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {computedItems.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>
                        {item.productCode || '-'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <strong style={{ color: '#0f172a' }}>{item.productName}</strong>
                        {item.categoryName && <span style={{ color: '#64748b', fontSize: '9.5px', display: 'block', marginTop: '1px' }}>{item.categoryName}</span>}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}><strong>{item.quantity}</strong></td>
                      <td style={{ padding: '8px 10px', textAlign: isAr ? 'left' : 'right' }}>{item.price.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: isAr ? 'left' : 'right' }}>{item.taxAmount.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: isAr ? 'left' : 'right' }}>
                        <strong style={{ color: '#047857' }}>{item.computedTotal.toFixed(2)} {currency}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary & QR Code */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div style={{ flex: 1, display: 'flex', gap: '14px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {qrSvgString && (
                    <div style={{ width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrSvgString }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10.5px', color: '#047857', fontWeight: 700 }}>{isAr ? 'المبلغ المستحق كتابةً:' : 'Amount in words:'}</span>
                    <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', padding: '8px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '10.5px', marginTop: '4px', color: '#0f172a', lineHeight: 1.5 }}>
                      {wordsTotal}
                    </div>
                  </div>
                </div>

                <div style={{ width: '290px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'المجموع قبل الضريبة:' : 'Subtotal:'}</span>
                    <strong>{subtotal.toFixed(2)} {currency}</strong>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#dc2626' }}>
                      <span>{isAr ? 'الخصم:' : 'Discount:'}</span>
                      <strong>-{discount.toFixed(2)} {currency}</strong>
                    </div>
                  )}
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#475569' }}>
                      <span>{isAr ? 'الوعاء الخاضع للضريبة:' : 'Taxable Amount:'}</span>
                      <strong>{taxableAmount.toFixed(2)} {currency}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                    <span style={{ color: '#475569' }}>{isAr ? `ضريبة القيمة المضافة (${company.vatRate}%):` : `VAT (${company.vatRate}%):`}</span>
                    <strong>{tax.toFixed(2)} {currency}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: '13.5px', borderTop: '2px solid #047857' }}>
                    <span>{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                    <span>{grandTotal.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                <div style={{ width: '28%' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '32px' }}>{isAr ? 'توقيع المستلم' : 'Receiver'}</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>{isAr ? 'الاسم والتوقيع' : 'Name & Sign'}</div>
                </div>
                <div style={{ width: '28%' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '32px' }}>{isAr ? 'مسؤول المبيعات' : 'Sales Representative'}</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>{data.creatorName || (isAr ? 'المسؤول المعتمد' : 'Authorized Sign')}</div>
                </div>
                <div style={{ width: '28%' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '32px' }}>{isAr ? 'الختم الرسمي' : 'Official Stamp'}</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>{company.companyName}</div>
                </div>
              </div>
            </div>
          ) : (
            /* Thermal 80mm Receipt Preview Card */
            <div 
              style={{
                width: '320px',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                padding: '16px',
                color: '#000000',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                lineHeight: 1.35,
                direction: isAr ? 'rtl' : 'ltr'
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 800 }}>{company.companyName}</h3>
                <p style={{ margin: '1px 0', fontSize: '10px' }}>{company.address}</p>
                <p style={{ margin: '1px 0', fontSize: '10px' }}>هاتف: {company.phone}</p>
                <p style={{ margin: '1px 0', fontSize: '10px' }}>الرقم الضريبي: {company.taxNumber}</p>
                <div style={{ border: '1px solid #000', display: 'inline-block', padding: '2px 6px', fontWeight: 700, fontSize: '11px', marginTop: '4px' }}>
                  {isAr ? 'فاتورة مبسطة' : 'Simplified Invoice'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>#{data.invoiceNumber}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                <span>التاريخ: {formattedDate}</span>
                <span>العميل: {data.entityName || (isAr ? 'نقدي' : 'Cash')}</span>
              </div>

              <table style={{ width: '100%', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', margin: '6px 0', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: isAr ? 'right' : 'left', padding: '2px 0' }}>{isAr ? 'الصنف' : 'Item'}</th>
                    <th style={{ textAlign: 'center', padding: '2px 0' }}>{isAr ? 'الكمية' : 'Qty'}</th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}>{isAr ? 'السعر' : 'Price'}</th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}>{isAr ? 'المجموع' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {computedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '2px 0' }}>{item.productName}</td>
                      <td style={{ textAlign: 'center', padding: '2px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}>{item.price.toFixed(2)}</td>
                      <td style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}><strong>{item.computedTotal.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '6px', fontSize: '10.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>{isAr ? 'المجموع قبل الضريبة:' : 'Subtotal:'}</span>
                  <span>{subtotal.toFixed(2)} {currency}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', color: '#dc2626' }}>
                    <span>{isAr ? 'الخصم:' : 'Discount:'}</span>
                    <span>-{discount.toFixed(2)} {currency}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>{isAr ? `ضريبة القيمة المضافة (${company.vatRate}%):` : `VAT (${company.vatRate}%):`}</span>
                  <span>{tax.toFixed(2)} {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', borderTop: '1px solid #000', paddingTop: '3px', fontWeight: 900, fontSize: '12px' }}>
                  <span>{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                  <span>{grandTotal.toFixed(2)} {currency}</span>
                </div>
              </div>

              {qrSvgString && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }} dangerouslySetInnerHTML={{ __html: qrSvgString }} />
              )}

              <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px' }}>
                <p style={{ margin: '1px 0' }}>{company.invoiceFooter || 'شكراً لتعاملكم معنا'}</p>
                <p style={{ margin: '1px 0', color: '#666' }}>Supplyra ERP</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
