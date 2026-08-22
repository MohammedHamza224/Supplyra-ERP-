const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/suppliers/SuppliersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const injection = `
                      <td>
                          <span style={{ fontSize: '0.875rem' }}>{supplier.address ? supplier.address : (language === 'ar' ? 'غير محدد' : 'Not set')}</span>
                      </td>
                      <td>
                          {(() => {
                              let mapsUrl = '';
                              if (supplier.google_maps_url) {
                                mapsUrl = supplier.google_maps_url;
                              } else if (supplier.latitude && supplier.longitude) {
                                mapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${supplier.latitude},\${supplier.longitude}\`;
                              }
                              
                              return mapsUrl ? (
                                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                                  <MapPin size={16} />
                                  {language === 'ar' ? 'فتح الموقع' : 'Open Location'}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={16} />
                                  {language === 'ar' ? 'الموقع غير محدد' : 'Location not set'}
                                </span>
                              );
                          })()}
                      </td>`;

// If it's already there (maybe it was partly added), don't duplicate.
if (!content.includes('mapsUrl = supplier.google_maps_url;')) {
  content = content.replace(
    /<td>\{supplier\.email \|\| '-'\}<\/td>/,
    `<td>{supplier.email || '-'}</td>${injection}`
  );
  
  // also check if colSpan is updated
  content = content.replace(/colSpan=\{6\}/g, 'colSpan={8}');
  
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Fixed table body in SuppliersList.tsx');
} else {
  console.log('Already fixed or different issue.');
}
