const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const sAddressLabel = Buffer.from('2KfZhNi52YbZiNin2YY=', 'base64').toString('utf8'); // العنوان
const sLocationLabel = Buffer.from('2KfZhNmF2YjZgti5', 'base64').toString('utf8'); // الموقع
const sNotSet = Buffer.from('2LrZitixINmF2K3Yr9iv', 'base64').toString('utf8'); // غير محدد
const sOpenLocation = Buffer.from('2YHYqtitINin2YTZhdmI2YLYuQ==', 'base64').toString('utf8'); // فتح الموقع
const sLocationNotSet = Buffer.from('2KfZhNmF2YjZgti5INi62YrYsSDZhdiv2K8=', 'base64').toString('utf8'); // الموقع غير محدد
const pin = Buffer.from('8J+TjA==', 'base64').toString('utf8'); // 📍

// 1. Replace <th>
const oldTh = /<th>\{t\('customers\.locations'\)\}<\/th>/;
const newTh = `<th>{language === 'ar' ? '${sAddressLabel}' : 'Address'}</th>
                <th>{language === 'ar' ? '${sLocationLabel}' : 'Location'}</th>`;
content = content.replace(oldTh, newTh);

// 2. Replace <td>
const oldTdRegex = /<td>\s*\{\(\(\) => \{\s*const loc = customer\.customer_locations[\s\S]*?\}\)\(\)\}\s*<\/td>/;

const newTd = `<td>
                        {(() => {
                           const loc = customer.customer_locations && customer.customer_locations.length > 0 ? customer.customer_locations[0] : null;
                           const textAddress = loc?.address || customer.address;
                           return <span style={{ fontSize: '0.875rem' }}>{textAddress ? textAddress : (language === 'ar' ? '${sNotSet}' : 'Not set')}</span>;
                        })()}
                      </td>
                      <td>
                        {(() => {
                            const loc = customer.customer_locations && customer.customer_locations.length > 0 ? customer.customer_locations[0] : null;
                            let mapsUrl = '';
                            if (loc) {
                              if (loc.google_maps_url) {
                                mapsUrl = loc.google_maps_url;
                              } else if (loc.latitude && loc.longitude) {
                                mapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${loc.latitude},\${loc.longitude}\`;
                              }
                            }
                            
                            return mapsUrl ? (
                              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                                ${pin} {language === 'ar' ? '${sOpenLocation}' : 'Open Location'}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                ${pin} {language === 'ar' ? '${sLocationNotSet}' : 'Location not set'}
                              </span>
                            );
                        })()}
                      </td>`;

content = content.replace(oldTdRegex, newTd);

fs.writeFileSync(targetFile, content);
console.log('Successfully separated Address and Location into two distinct columns in CustomersList.tsx');
