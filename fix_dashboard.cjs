const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/dashboard/Dashboard.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Fix date parsing in Dashboard
content = content.replace(
  /const exp = new Date\(b\.expiry_date\);\s*const diffTime = exp\.getTime\(\) - todayTime;\s*const diffDays = Math\.ceil\(diffTime \/ \(1000 \* 60 \* 60 \* 24\)\);/,
  `const [yyyy, mm, dd] = b.expiry_date.split('-');
            const exp = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
            const diffTime = exp.getTime() - todayTime;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated Dashboard.tsx date parsing logic.');
