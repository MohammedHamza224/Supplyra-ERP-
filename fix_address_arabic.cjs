const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/customers/CustomersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const s1 = Buffer.from('8J+TjSDYp9mE2LnZhtmI2KfZhjo=', 'base64').toString('utf8'); // 📍 العنوان:
const s2 = Buffer.from('2LrZitixINmF2K3Yr9iv', 'base64').toString('utf8'); // غير محدد
const s3 = Buffer.from('8J+TjSDZgdiq2K0g2KfZhNmF2YjZgti5', 'base64').toString('utf8'); // 📍 فتح الموقع
const s4 = Buffer.from('8J+TjSDYp9mE2YXZiNmC2Lkg2LrZitixINmF2K3Yr9iv', 'base64').toString('utf8'); // 📍 الموقع غير محدد
const pin = Buffer.from('8J+TjA==', 'base64').toString('utf8'); // 📍

const newRender = `const textAddress = loc?.address || customer.address;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '0.875rem' }}>
                                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{language === 'ar' ? '${s1}' : '${pin} Address:'}</div>
                                <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>{textAddress ? textAddress : (language === 'ar' ? '${s2}' : 'Not set')}</div>
                              </div>
                              <div>
                                {mapsUrl ? (
                                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                                    {language === 'ar' ? '${s3}' : '${pin} Open Location'}
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                    {language === 'ar' ? '${s4}' : '${pin} Location not set'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}`;

const oldRenderRegex = /const textAddress = loc\?\.address \|\| customer\.address;[\s\S]*?\}\)\(\)\}/;

content = content.replace(oldRenderRegex, newRender);

fs.writeFileSync(targetFile, content);
console.log('Fixed address Arabic text corruption in CustomersList.tsx');
