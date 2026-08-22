const fs = require('fs');

const filePath = 'src/pages/analytics/AnalyticsDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Receipt and FileText to imports
content = content.replace(
  "import { BarChart3, TrendingUp, TrendingDown, Users, Package, ShoppingCart, Truck, MapPin, Factory, AlertTriangle } from 'lucide-react';",
  "import { BarChart3, TrendingUp, TrendingDown, Users, Package, ShoppingCart, Truck, MapPin, Factory, AlertTriangle, Receipt, FileText } from 'lucide-react';"
);

// 2. Add the two new StatCards
const oldCards = "<StatCard title={isRtl ? 'عدد المستودعات' : 'Total Warehouses'} value={metrics.totalWarehouses} icon={MapPin} color=\"#06b6d4\" />";
const newCards = `<StatCard title={isRtl ? 'عدد المستودعات' : 'Total Warehouses'} value={metrics.totalWarehouses} icon={MapPin} color="#06b6d4" />
        <StatCard title={isRtl ? 'عدد فواتير المبيعات' : 'Sales Invoices'} value={metrics.totalSalesCount} icon={Receipt} color="#10b981" />
        <StatCard title={isRtl ? 'عدد فواتير المشتريات' : 'Purchase Invoices'} value={metrics.totalPurchasesCount} icon={FileText} color="#ef4444" />`;

// Fallback logic for Arabic encoding string literal just in case
const oldCardsFallback = "icon={MapPin} color=\"#06b6d4\" />";
const newCardsFallback = `icon={MapPin} color="#06b6d4" />
        <StatCard title={isRtl ? 'عدد فواتير المبيعات' : 'Sales Invoices'} value={metrics.totalSalesCount} icon={Receipt} color="#10b981" />
        <StatCard title={isRtl ? 'عدد فواتير المشتريات' : 'Purchase Invoices'} value={metrics.totalPurchasesCount} icon={FileText} color="#ef4444" />`;

if (content.includes(oldCards)) {
  content = content.replace(oldCards, newCards);
} else {
  content = content.replace(oldCardsFallback, newCardsFallback);
}

fs.writeFileSync(filePath, content);
console.log("Updated AnalyticsDashboard.tsx");
