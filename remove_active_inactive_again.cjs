const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove handleDeactivate function
const handleDeactivateRegex = /const handleDeactivate = async \([\s\S]*?catch\(e: any\)\s*\{\s*alert\(e\.message\);\s*\}\s*\};\s*/;
content = content.replace(handleDeactivateRegex, '');

// 2. Remove the customers.deactivate button
const buttonSectionRegex = /\{hasPermission\('customers\.deactivate'\) && \([\s\S]*?<\/button>\s*\)\}/;

content = content.replace(buttonSectionRegex, '');

fs.writeFileSync(targetFile, content);
console.log('Successfully removed Active/Inactive button, leaving only Edit and Delete');
