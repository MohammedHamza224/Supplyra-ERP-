const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const errorMessage = Buffer.from('2YTYpyDZitmF2YPZhiDYrdiw2YEg2KfZhNi52YXZitmEINmE2YjYrNmI2K8g2LfZhNio2KfYqiDZhdix2KrYqNi32Kkg2KjZhy4=', 'base64').toString('utf8');

// The regex might have some special characters because of the corruption, so I will replace the whole throw line
const errorRegex = /throw new Error\('.*Cannot delete customer because they have linked orders'\)'?\);/;

content = content.replace(errorRegex, `throw new Error('${errorMessage}');`);

// Just in case it's slightly different
const alternativeRegex = /throw new Error\([^)]+Cannot delete customer[^)]+\);/;
content = content.replace(alternativeRegex, `throw new Error('${errorMessage}');`);

fs.writeFileSync(targetFile, content);
console.log('Fixed error message text in CustomersList.tsx');
