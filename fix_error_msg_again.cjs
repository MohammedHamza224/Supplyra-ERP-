const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const errorMessage = Buffer.from('2YTYpyDZitmF2YPZhiDYrdiw2YEg2KfZhNi52YXZitmEINmE2YjYrNmI2K8g2LfZhNio2KfYqiDZhdix2KrYqNi32Kkg2KjZhy4=', 'base64').toString('utf8');

// Match the mangled string
const errorRegex = /throw new Error\('\?\? \?\?\?\? \?\?\? \?\?\?\?\?\? \?\?\?\?\? \?\?\?\?\? \?\?\?\?\?\? \?\?\.'\);/;

content = content.replace(errorRegex, `throw new Error('${errorMessage}');`);

fs.writeFileSync(targetFile, content);
console.log('Fixed error message text properly in CustomersList.tsx');
