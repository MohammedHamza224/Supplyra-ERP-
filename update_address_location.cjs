const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Update the fetch query to include `address`
content = content.replace(
  /id, name, mobile, payment_type, active,\s*customer_locations\(id, google_maps_url, latitude, longitude\)/,
  "id, name, mobile, address, payment_type, active,\n            customer_locations(id, address, google_maps_url, latitude, longitude)"
);

// 2. Update the rendering of the location column
const oldRenderRegex = /if \(mapsUrl\) \{\s*return \(\s*<a href=\{mapsUrl\} target="_blank"[\s\S]*?<\/span>\s*\);\s*\n\s*\}\)\(\)\}/;

const newRender = `const textAddress = loc?.address || customer.address;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '0.875rem' }}>
                                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>📍 {language === 'ar' ? 'العنوان:' : 'Address:'}</div>
                                <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>{textAddress ? textAddress : (language === 'ar' ? 'غير محدد' : 'Not set')}</div>
                              </div>
                              <div>
                                {mapsUrl ? (
                                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                                    📍 {language === 'ar' ? 'فتح الموقع' : 'Open Location'}
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                    📍 {language === 'ar' ? 'الموقع غير محدد' : 'Location not set'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}`;

content = content.replace(oldRenderRegex, newRender);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated Address and Location rendering in CustomersList.tsx');
