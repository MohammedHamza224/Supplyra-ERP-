/**
 * Tafqeet Utility (تحويل الأرقام إلى كلمات باللغة العربية والإنجليزية)
 * Professional ERP Currency-to-Words Converter for Invoices & Vouchers
 */

interface TafqeetOptions {
  currency?: 'SAR' | 'USD' | 'EUR' | 'EGP' | 'AED' | string;
  language?: 'ar' | 'en';
}

const AR_ONES = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'
];

const AR_ONES_FEM = [
  '', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'
];

const AR_TEENS = [
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

const AR_TENS = [
  '', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'
];

const AR_HUNDREDS = [
  '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
];

const EN_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const EN_TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertThreeDigitsArabic(num: number): string {
  let text = '';
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    text += AR_HUNDREDS[hundreds];
  }

  if (remainder > 0) {
    if (text) text += ' و';

    if (remainder < 10) {
      text += AR_ONES[remainder];
    } else if (remainder < 20) {
      text += AR_TEENS[remainder - 10];
    } else {
      const ones = remainder % 10;
      const tens = Math.floor(remainder / 10);
      if (ones > 0) {
        text += `${AR_ONES[ones]} و${AR_TENS[tens]}`;
      } else {
        text += AR_TENS[tens];
      }
    }
  }

  return text;
}

export function tafqeetArabic(amount: number, currency: string = 'SAR'): string {
  if (amount === 0) return 'صفر ريال سعودي لا غير';
  if (isNaN(amount)) return '';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let currencyName = 'ريال سعودي';
  let subCurrencyName = 'هللة';

  if (currency === 'USD') {
    currencyName = 'دولار أمريكي';
    subCurrencyName = 'سنت';
  } else if (currency === 'EUR') {
    currencyName = 'يورو';
    subCurrencyName = 'سنت';
  } else if (currency === 'EGP') {
    currencyName = 'جنيه مصري';
    subCurrencyName = 'قرش';
  } else if (currency === 'AED') {
    currencyName = 'درهم إماراتي';
    subCurrencyName = 'فلس';
  }

  const scales = [
    { value: 1000000000, singular: 'مليار', dual: 'ملياران', plural: 'مليارات' },
    { value: 1000000, singular: 'مليون', dual: 'مليونان', plural: 'ملايين' },
    { value: 1000, singular: 'ألف', dual: 'ألفان', plural: 'آلاف' },
    { value: 1, singular: '', dual: '', plural: '' }
  ];

  let remaining = integerPart;
  const parts: string[] = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining %= scale.value;

      if (scale.value === 1) {
        const text = convertThreeDigitsArabic(count);
        if (text) parts.push(text);
      } else if (count === 1) {
        parts.push(scale.singular);
      } else if (count === 2) {
        parts.push(scale.dual);
      } else if (count >= 3 && count <= 10) {
        parts.push(`${convertThreeDigitsArabic(count)} ${scale.plural}`);
      } else {
        parts.push(`${convertThreeDigitsArabic(count)} ${scale.singular}`);
      }
    }
  }

  let result = parts.join(' و');
  if (!result) result = 'صفر';

  let finalPhrase = `فقط ${result} ${currencyName}`;

  if (decimalPart > 0) {
    const decimalText = convertThreeDigitsArabic(decimalPart);
    finalPhrase += ` و${decimalText} ${subCurrencyName}`;
  }

  finalPhrase += ' لا غير';

  if (isNegative) {
    finalPhrase = `سالب ${finalPhrase}`;
  }

  return finalPhrase;
}

function convertThreeDigitsEnglish(num: number): string {
  let text = '';
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    text += `${EN_ONES[hundreds]} Hundred`;
    if (remainder > 0) text += ' and ';
  }

  if (remainder > 0) {
    if (remainder < 20) {
      text += EN_ONES[remainder];
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      text += EN_TENS[tens];
      if (ones > 0) text += `-${EN_ONES[ones]}`;
    }
  }

  return text;
}

export function tafqeetEnglish(amount: number, currency: string = 'SAR'): string {
  if (amount === 0) return 'Zero SAR Only';
  if (isNaN(amount)) return '';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const scales = [
    { value: 1000000000, name: 'Billion' },
    { value: 1000000, name: 'Million' },
    { value: 1000, name: 'Thousand' },
    { value: 1, name: '' }
  ];

  let remaining = integerPart;
  const parts: string[] = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining %= scale.value;
      const text = convertThreeDigitsEnglish(count);
      if (text) {
        parts.push(scale.name ? `${text} ${scale.name}` : text);
      }
    }
  }

  let result = parts.join(', ');
  if (!result) result = 'Zero';

  let finalPhrase = `Only ${result} ${currency}`;

  if (decimalPart > 0) {
    const decimalText = convertThreeDigitsEnglish(decimalPart);
    finalPhrase += ` and ${decimalText} Halalas`;
  }

  finalPhrase += ' Only';

  if (isNegative) {
    finalPhrase = `Minus ${finalPhrase}`;
  }

  return finalPhrase;
}

export function tafqeet(amount: number, options: TafqeetOptions = {}): string {
  const { currency = 'SAR', language = 'ar' } = options;
  if (language === 'ar') {
    return tafqeetArabic(amount, currency);
  }
  return tafqeetEnglish(amount, currency);
}
