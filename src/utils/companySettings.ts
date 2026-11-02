import { supabase } from '../lib/supabase';

export interface CompanySettings {
  companyName: string;
  tagline: string;
  logoUrl?: string;
  commercialRegister: string;
  taxNumber: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  vatRate: number;
  currency: string;
  invoiceFooter: string;
  autoTaxQr: boolean;
  thermalPrinting: boolean;
}

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Supplyra ERP',
  tagline: 'إدارة توزيع الأغذية وسلاسل الإمداد',
  logoUrl: '',
  commercialRegister: '1010887654',
  taxNumber: '310000000000003',
  phone: '+966 50 000 0000',
  email: 'contact@supplyra.com',
  website: 'https://supplyra-erp.vercel.app',
  address: 'الرياض، المملكة العربية السعودية',
  vatRate: 15,
  currency: 'SAR',
  invoiceFooter: 'شكراً لتعاملكم معنا. تخضع جميع التعاملات للشروط والأحكام المعتمدة.',
  autoTaxQr: true,
  thermalPrinting: false
};

/**
 * Synchronously retrieves cached company settings from localStorage or defaults
 */
export function getCachedCompanySettings(): CompanySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const cached = localStorage.getItem('supplyra_system_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        companyName: parsed.systemName || parsed.companyName || DEFAULT_SETTINGS.companyName,
        tagline: parsed.tagline || DEFAULT_SETTINGS.tagline,
        logoUrl: parsed.logoUrl || DEFAULT_SETTINGS.logoUrl,
        commercialRegister: parsed.commercialRegister || DEFAULT_SETTINGS.commercialRegister,
        taxNumber: parsed.taxNumber || DEFAULT_SETTINGS.taxNumber,
        phone: parsed.phone || DEFAULT_SETTINGS.phone,
        email: parsed.email || DEFAULT_SETTINGS.email,
        website: parsed.website || DEFAULT_SETTINGS.website,
        address: parsed.address || DEFAULT_SETTINGS.address,
        vatRate: parsed.vatRate !== undefined ? Number(parsed.vatRate) : DEFAULT_SETTINGS.vatRate,
        currency: parsed.currency || DEFAULT_SETTINGS.currency,
        invoiceFooter: parsed.invoiceFooter || DEFAULT_SETTINGS.invoiceFooter,
        autoTaxQr: parsed.autoTaxQr ?? DEFAULT_SETTINGS.autoTaxQr,
        thermalPrinting: parsed.thermalPrinting ?? DEFAULT_SETTINGS.thermalPrinting,
      };
    }
  } catch (err) {
    console.warn('Failed to parse cached company settings:', err);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Asynchronously loads company settings from Supabase business_settings with fallback to cache
 */
export async function fetchCompanySettings(): Promise<CompanySettings> {
  const cached = getCachedCompanySettings();

  try {
    const { data: bData, error } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && bData) {
      const merged: CompanySettings = {
        companyName: bData.company_name || bData.system_name || cached.companyName,
        tagline: bData.tagline || cached.tagline,
        logoUrl: bData.logo_url || cached.logoUrl,
        commercialRegister: bData.commercial_register || cached.commercialRegister,
        taxNumber: bData.tax_number || cached.taxNumber,
        phone: bData.phone || cached.phone,
        email: bData.email || cached.email,
        website: bData.website || cached.website,
        address: bData.company_address || bData.address || cached.address,
        vatRate: bData.vat_percentage !== undefined ? Number(bData.vat_percentage) : cached.vatRate,
        currency: bData.currency || cached.currency,
        invoiceFooter: bData.receipt_footer || bData.invoice_footer || cached.invoiceFooter,
        autoTaxQr: bData.auto_tax_qr ?? cached.autoTaxQr,
        thermalPrinting: bData.thermal_printing ?? cached.thermalPrinting,
      };

      // Update cache
      localStorage.setItem('supplyra_system_settings', JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch remote business settings, using cache:', err);
  }

  return cached;
}
