const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const oldSConfirmQ = '2YfZhCDYo9mG2Kog2YXYqtij2YPYryDZhdmGINit2LDZgSDZh9iw2Kcg2KfZhNi52YXZitmEINmG2YfYp9im2YrZi9in2J8=';
const newSConfirmQ = '2YfZhCDYo9mG2Kog2YXYqtij2YPYryDZhdmGINit2LDZgSDYp9mE2LnZhdmK2YQg2YbZh9in2KbZitmL2KfYnw==';

content = content.replace(oldSConfirmQ, newSConfirmQ);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated confirmation modal text');
