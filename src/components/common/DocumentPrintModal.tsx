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
  const subtotal = Number(data.subtotal || data.items.reduce((s, i) => s + (Number(i.total) || 0), 0));
  const discount = Number(data.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number(data.tax !== undefined ? data.tax : (taxableAmount * (company.vatRate / 100)));
  const grandTotal = Number(data.grandTotal || (taxableAmount + tax));

  const wordsTotal = tafqeet(grandTotal, { currency: 'SAR', language: docLanguage });

  const formattedDate = data.date ? new Date(data.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }) : new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US');

  // QR Code
  let qrSvgString = '';
  if (company.autoTaxQr) {
    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: company.companyName,
      vatNumber: company.taxNumber,
      timestamp: data.date || new Date().toISOString(),
      totalAmount: grandTotal,
      vatAmount: tax
    });
    qrSvgString = generateQrSvg(tlvBase64, format === 'THERMAL_80MM' ? 120 : 100);
  }

  const handlePrint = () => {
    setPrinting(true);
    const invoiceToPrint: InvoiceData = {
      ...data,
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: isAr ? "'Segoe UI', Tahoma, sans-serif" : "'Inter', sans-serif"
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '94vh',
          backgroundColor: 'var(--color-surface, #ffffff)',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--color-border, #e2e8f0)'
        }}
      >
        {/* Top Action & Control Bar */}
        <div 
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-background, #f8fafc)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary, #0f172a)' }}>
                {isAr ? 'معاينة وطباعة المستند' : 'Document Print Preview'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                #{data.invoiceNumber} • {company.companyName}
              </span>
            </div>
          </div>

          {/* Quick Customization Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Format Toggle (A4 vs Thermal) */}
            <div style={{ display: 'inline-flex', backgroundColor: 'var(--color-surface, #ffffff)', borderRadius: '8px', padding: '3px', border: '1px solid var(--color-border, #cbd5e1)' }}>
              <button
                type="button"
                onClick={() => setFormat('A4')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: format === 'A4' ? '#047857' : 'transparent',
                  color: format === 'A4' ? '#ffffff' : 'var(--color-text-secondary, #475569)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={14} />
                <span>A4</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('THERMAL_80MM')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: format === 'THERMAL_80MM' ? '#047857' : 'transparent',
                  color: format === 'THERMAL_80MM' ? '#ffffff' : 'var(--color-text-secondary, #475569)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={14} />
                <span>{isAr ? 'حراري 80مم' : 'Thermal 80mm'}</span>
              </button>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setDocLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #cbd5e1)',
                backgroundColor: 'var(--color-surface, #ffffff)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--color-text-primary, #0f172a)'
              }}
              title={isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
            >
              <Globe size={14} />
              <span>{docLanguage === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Print Now Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#047857',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: printing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Printer size={16} />
              <span>{printing ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'طباعة المستند' : 'Print Now')}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #cbd5e1)',
                backgroundColor: 'var(--color-surface, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-text-muted, #64748b)'
              }}
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
            padding: '24px 16px',
            backgroundColor: '#64748b20',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {format === 'A4' ? (
            /* A4 Document Preview Card */
            <div 
              style={{
                width: '100%',
                maxWidth: '780px',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0,0,0,0.06)',
                padding: '32px 36px',
                color: '#0f172a',
                fontSize: '11.5px',
                lineHeight: 1.45,
                direction: isAr ? 'rtl' : 'ltr'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2.5px solid #047857', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '58px', height: '58px', borderRadius: '8px', background: 'linear-gradient(135deg, #047857, #10b981)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>S</div>
                  )}
                  <div>
                    <h1 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 3px 0', color: '#047857' }}>{company.companyName}</h1>
                    <p style={{ margin: '1px 0', fontSize: '10.5px', color: '#475569' }}>{company.tagline}</p>
                    <p style={{ margin: '1px 0', fontSize: '10px', color: '#64748b' }}>{company.address} • هاتف: {company.phone}</p>
                    <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 600 }}>
                      الرقم الضريبي: <strong>{company.taxNumber}</strong> • السجل التجاري: <strong>{company.commercialRegister}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <div style={{ display: 'inline-block', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, marginBottom: '3px' }}>
                    {isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{data.invoiceNumber}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                    {isAr ? 'بيانات العميل / الطرف الآخر' : 'Customer Information'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'الاسم:' : 'Name:'}</span>
                    <strong>{data.entityName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</strong>
                  </div>
                  {data.entityTaxNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الرقم الضريبي:' : 'Tax No:'}</span>
                      <strong>{data.entityTaxNumber}</strong>
                    </div>
                  )}
                  {data.entityPhone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الهاتف:' : 'Phone:'}</span>
                      <span>{data.entityPhone}</span>
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                    {isAr ? 'بيانات المستند' : 'Document Details'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'تاريخ الإصدار:' : 'Issue Date:'}</span>
                    <strong>{formattedDate}</strong>
                  </div>
                  {data.warehouseName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'المستودع:' : 'Warehouse:'}</span>
                      <span>{data.warehouseName}</span>
                    </div>
                  )}
                  {data.paymentMethod && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'طريقة الدفع:' : 'Payment:'}</span>
                      <span>{data.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '25px' }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'الصنف والوصف' : 'Item Description'}</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '55px' }}>{isAr ? 'الكمية' : 'Qty'}</th>
                    <th style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right', width: '75px' }}>{isAr ? 'السعر' : 'Price'}</th>
                    <th style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right', width: '65px' }}>{isAr ? 'الضريبة' : 'VAT'}</th>
                    <th style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right', width: '90px' }}>{isAr ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <strong>{item.productName}</strong>
                        {item.productCode && <span style={{ color: '#64748b', fontSize: '9.5px', display: 'block' }}>{item.productCode}</span>}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}><strong>{item.quantity}</strong></td>
                      <td style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right' }}>{Number(item.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right' }}>{Number(item.taxAmount || ((item.price * item.quantity) * (company.vatRate / 100))).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right' }}><strong>{Number(item.total || 0).toFixed(2)} {currency}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary & QR Code */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {qrSvgString && (
                    <div style={{ width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: '2px', borderRadius: '4px', border: '1px solid #cbd5e1' }} dangerouslySetInnerHTML={{ __html: qrSvgString }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: '#047857', fontWeight: 700 }}>{isAr ? 'المبلغ المستحق كتابةً:' : 'Amount in words:'}</span>
                    <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', padding: '6px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '10px', marginTop: '3px' }}>
                      {wordsTotal}
                    </div>
                  </div>
                </div>

                <div style={{ width: '270px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '10.5px' }}>
                    <span>{isAr ? 'المجموع قبل الضريبة:' : 'Subtotal:'}</span>
                    <strong>{subtotal.toFixed(2)} {currency}</strong>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '10.5px', color: '#dc2626' }}>
                      <span>{isAr ? 'الخصم:' : 'Discount:'}</span>
                      <strong>-{discount.toFixed(2)} {currency}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '10.5px' }}>
                    <span>{isAr ? `ضريبة القيمة المضافة (${company.vatRate}%):` : `VAT (${company.vatRate}%):`}</span>
                    <strong>{tax.toFixed(2)} {currency}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: '13px', borderTop: '2px solid #047857' }}>
                    <span>{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                    <span>{grandTotal.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                <div style={{ width: '28%' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '35px' }}>{isAr ? 'توقيع المستلم' : 'Receiver'}</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>{isAr ? 'الاسم والتوقيع' : 'Name & Sign'}</div>
                </div>
                <div style={{ width: '28%' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '35px' }}>{isAr ? 'مسؤول المبيعات' : 'Sales Representative'}</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>{data.creatorName || (isAr ? 'المسؤول المعتمد' : 'Authorized Sign')}</div>
                </div>
                <div style={{ width: '28%' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '35px' }}>{isAr ? 'الختم الرسمي' : 'Official Stamp'}</div>
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
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
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
                <span>العميل: {data.entityName || 'نقدي'}</span>
              </div>

              <table style={{ width: '100%', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', margin: '6px 0', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: isAr ? 'right' : 'left', padding: '2px 0' }}>الصنف</th>
                    <th style={{ textAlign: 'center', padding: '2px 0' }}>الكمية</th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}>السعر</th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '2px 0' }}>{item.productName}</td>
                      <td style={{ textAlign: 'center', padding: '2px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}>{Number(item.price || 0).toFixed(2)}</td>
                      <td style={{ textAlign: isAr ? 'left' : 'right', padding: '2px 0' }}><strong>{Number(item.total || 0).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '6px', fontSize: '10.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>المجموع قبل الضريبة:</span>
                  <span>{subtotal.toFixed(2)} {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>ضريبة القيمة المضافة ({company.vatRate}%):</span>
                  <span>{tax.toFixed(2)} {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', borderTop: '1px solid #000', paddingTop: '3px', fontWeight: 900, fontSize: '12px' }}>
                  <span>الإجمالي النهائي:</span>
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
