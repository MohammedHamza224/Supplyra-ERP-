const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/inventory/InventoryList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix date parsing and status logic
content = content.replace(
  /const expDate = new Date\(b\.expiry_date\);\s*const today = new Date\(\);\s*today\.setHours\(0,0,0,0\);\s*const diffTime = expDate\.getTime\(\) - today\.getTime\(\);\s*const diffDays = Math\.ceil\(diffTime \/ \(1000 \* 60 \* 60 \* 24\)\);\s*let status = 'Valid';\s*if \(diffDays < 0\) status = 'Expired';\s*else if \(diffDays === 0\) status = 'Expires Today';\s*else if \(diffDays <= 30\) status = 'Expiring Soon';/,
  `const [yyyy, mm, dd] = b.expiry_date.split('-');
        const expDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = diffDays < 0 ? 'Expired' : 'Valid';`
);

// 2. Fix getStatusBadge
content = content.replace(
  /const getStatusBadge = \(status\?: string\) => \{\s*switch \(status\) \{\s*case 'Expired':\s*return <span className="badge badge-danger"><AlertTriangle size=\{12\} style=\{\{marginRight: '4px'\}\}\/> \{t\('expiry\.expired'\)\}<\/span>;\s*case 'Expires Today':\s*return <span className="badge badge-danger"><Clock size=\{12\} style=\{\{marginRight: '4px'\}\}\/> \{t\('expiry\.expiresToday'\)\}<\/span>;\s*case 'Expiring Soon':\s*return <span className="badge badge-warning"><Calendar size=\{12\} style=\{\{marginRight: '4px'\}\}\/> \{t\('expiry\.expiringSoon'\)\}<\/span>;\s*default:\s*return <span className="badge badge-success"><CircleCheck size=\{12\} style=\{\{marginRight: '4px'\}\}\/> \{t\('expiry\.valid'\)\}<\/span>;\s*\}\s*\};/,
  `const getStatusBadge = (status?: string) => {
    if (status === 'Expired') {
      return <span className="badge badge-danger"><AlertTriangle size={12} style={{marginRight: '4px'}}/> {t('common.inactive')}</span>;
    }
    return <span className="badge badge-success"><CircleCheck size={12} style={{marginRight: '4px'}}/> {t('common.active')}</span>;
  };`
);

// 3. Fix dropdown options
content = content.replace(
  /<option value="Valid">\{t\('expiry\.valid'\)\}<\/option>\s*<option value="Expiring Soon">\{t\('expiry\.expiringSoon'\)\}<\/option>\s*<option value="Expires Today">\{t\('expiry\.expiresToday'\)\}<\/option>\s*<option value="Expired">\{t\('expiry\.expired'\)\}<\/option>/,
  `<option value="Valid">{t('common.active')}</option>
                <option value="Expired">{t('common.inactive')}</option>`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated InventoryList.tsx with robust expiry status logic.');
