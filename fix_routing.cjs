const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

if (!appContent.includes('<Route path="settings" element={<Settings />} />')) {
  appContent = appContent.replace(
    '<Route path="*" element={<Navigate to="/" replace />} />',
    '<Route path="settings" element={<Settings />} />\n            <Route path="*" element={<Navigate to="/" replace />} />'
  );
}

fs.writeFileSync('src/App.tsx', appContent);
