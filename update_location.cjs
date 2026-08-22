const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Destructure language
content = content.replace(
  /const \{ t \} = useTranslation\(\);/,
  "const { t, language } = useTranslation();"
);

// 2. Update the fetch query
content = content.replace(
  /customer_locations\(id\)/g,
  "customer_locations(id, google_maps_url, latitude, longitude)"
);

// 3. Update the rendering logic
const oldRender = /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var\(--color-text-secondary\)' \}\}>\s*<MapPin size=\{14\} \/>\s*<span>\{customer\.customer_locations\?\.length \|\| 0\}<\/span>\s*<\/div>/;

const newRender = `{(() => {
                          const loc = customer.customer_locations && customer.customer_locations.length > 0 ? customer.customer_locations[0] : null;
                          let mapsUrl = '';
                          if (loc) {
                            if (loc.google_maps_url) {
                              mapsUrl = loc.google_maps_url;
                            } else if (loc.latitude && loc.longitude) {
                              mapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${loc.latitude},\${loc.longitude}\`;
                            }
                          }
                          
                          if (mapsUrl) {
                            return (
                              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                                📍 {language === 'ar' ? 'فتح الموقع' : 'Open Location'}
                              </a>
                            );
                          }
                          
                          return (
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                              {language === 'ar' ? 'غير محدد' : 'Location not set'}
                            </span>
                          );
                        })()}`;

content = content.replace(oldRender, newRender);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated Location rendering in CustomersList.tsx');
