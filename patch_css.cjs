const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

const darkTheme = `

[data-theme='dark'] {
  --color-primary: #10b981;
  --color-primary-light: #34d399;
  --color-primary-dark: #059669;

  --color-background: #0f172a; /* Slate 900 */
  --color-surface: #1e293b; /* Slate 800 */
  --color-surface-hover: #334155; /* Slate 700 */

  --color-text-primary: #f8fafc; /* Slate 50 */
  --color-text-secondary: #cbd5e1; /* Slate 300 */
  --color-text-muted: #94a3b8; /* Slate 400 */
  
  --color-border: #334155; /* Slate 700 */
  --color-border-hover: #475569; /* Slate 600 */

  --sidebar-bg: #0b1120;
  --sidebar-border: #1e293b;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
}

/* Base styles to apply background and text colors */
body {
  background-color: var(--color-background);
  color: var(--color-text-primary);
}

[data-theme='dark'] .card, 
[data-theme='dark'] .modal-content {
  background-color: var(--color-surface);
  border-color: var(--color-border);
}

[data-theme='dark'] input, 
[data-theme='dark'] select, 
[data-theme='dark'] textarea,
[data-theme='dark'] .form-input,
[data-theme='dark'] .form-select {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

[data-theme='dark'] table th {
  background-color: var(--color-surface-hover);
  color: var(--color-text-secondary);
}

[data-theme='dark'] table tr {
  border-color: var(--color-border);
}

[data-theme='dark'] table tr:hover {
  background-color: var(--color-surface-hover);
}

[data-theme='dark'] .sidebar-item:hover {
  background-color: var(--sidebar-hover);
}
`;

if (!css.includes("[data-theme='dark']")) {
  fs.appendFileSync('src/index.css', darkTheme);
}
