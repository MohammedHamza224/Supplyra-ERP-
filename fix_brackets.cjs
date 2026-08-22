const fs = require('fs');

let settings = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// 1. Fix appearance tab closing
settings = settings.replace(
  "                </div>\n    \n  \n          {/* SECURITY SETTINGS */}",
  "                </div>\n            )}\n    \n  \n          {/* SECURITY SETTINGS */}"
);

// 2. Fix security tab closing
settings = settings.replace(
  "                </div>\n              </div>\n            </div>\n\n          {activeTab === 'permissions'",
  "                </div>\n              </div>\n            </div>\n          )}\n\n          {activeTab === 'permissions'"
);

// 3. Fix system tab closing
settings = settings.replace(
  "              </div>\n            </div>\n\n\n        </div>",
  "              </div>\n            </div>\n          )}\n\n\n        </div>"
);

fs.writeFileSync('src/pages/settings/Settings.tsx', settings);
