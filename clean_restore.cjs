const fs = require('fs');

let text = fs.readFileSync('restore_part1.txt', 'utf-8');
let lines = text.split('\n');

let cleaned = lines.map(line => {
  if (line.startsWith('-')) {
    return line.substring(1);
  }
  return line;
});

fs.writeFileSync('restored_block.ts', cleaned.join('\n'), 'utf-8');
