const fs = require('fs');

let content = fs.readFileSync('src/pages/sales/SaleDetails.tsx', 'utf8');

// 1. Add printInvoice import
if (!content.includes('printInvoice')) {
  content = content.replace(
    "import { supabase } from '../../lib/supabase';",
    "import { supabase } from '../../lib/supabase';\nimport { printInvoice } from '../../utils/printInvoice';"
  );
}

// 2. Add print button in header
const headerStr = `<button onClick={onClose} className="p-1 hover:bg-[var(--color-border)] rounded-full">
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>`;

const newHeaderStr = `<div className="flex gap-2">
            <button onClick={() => printInvoice(sale, items, 'SUPPLYRA', '')} className="p-1 hover:bg-[var(--color-border)] rounded-full text-blue-600" title="Print Invoice">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-[var(--color-border)] rounded-full">
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>`;

if (content.includes(headerStr)) {
  content = content.replace(headerStr, newHeaderStr);
}

fs.writeFileSync('src/pages/sales/SaleDetails.tsx', content);
console.log("Updated SaleDetails.tsx");
