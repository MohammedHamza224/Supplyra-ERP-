const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/inventory/InventoryList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Restore the 4 statuses
content = content.replace(
  /let status = diffDays < 0 \? 'Expired' : 'Valid';/,
  `let status = 'Valid';
          if (diffDays < 0) status = 'Expired';
          else if (diffDays === 0) status = 'Expires Today';
          else if (diffDays <= 30) status = 'Expiring Soon';`
);

// 2. Restore getStatusBadge
content = content.replace(
  /const getStatusBadge = \(status\?: string\) => \{\s*if \(status === 'Expired'\) \{\s*return <span className="badge badge-danger"><AlertTriangle size=\{12\} style=\{\{marginRight: '4px'\}\}\/> \{t\('common\.inactive'\)\}<\/span>;\s*\}\s*return <span className="badge badge-success"><CircleCheck size=\{12\} style=\{\{marginRight: '4px'\}\}\/> \{t\('common\.active'\)\}<\/span>;\s*\};/,
  `const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Expired':
        return <span className="badge badge-danger"><AlertTriangle size={12} style={{marginRight: '4px'}}/> {t('expiry.expired')}</span>;
      case 'Expires Today':
        return <span className="badge badge-danger"><Clock size={12} style={{marginRight: '4px'}}/> {t('expiry.expiresToday')}</span>;
      case 'Expiring Soon':
        return <span className="badge badge-warning"><Calendar size={12} style={{marginRight: '4px'}}/> {t('expiry.expiringSoon')}</span>;
      default:
        return <span className="badge badge-success"><CircleCheck size={12} style={{marginRight: '4px'}}/> {t('expiry.valid')}</span>;
    }
  };`
);

// 3. Restore dropdown options
content = content.replace(
  /<option value="Valid">\{t\('common\.active'\)\}<\/option>\s*<option value="Expired">\{t\('common\.inactive'\)\}<\/option>/,
  `<option value="Valid">{t('expiry.valid')}</option>
                <option value="Expiring Soon">{t('expiry.expiringSoon')}</option>
                <option value="Expires Today">{t('expiry.expiresToday')}</option>
                <option value="Expired">{t('expiry.expired')}</option>`
);

fs.writeFileSync(targetFile, content);
console.log('Restored InventoryList.tsx to have 4 expiry statuses.');
