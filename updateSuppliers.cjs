const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/suppliers/SuppliersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add MapPin to imports
content = content.replace(/Search, X, Truck, CheckCircle/, 'Search, X, Truck, CheckCircle, MapPin');

// 2. Add Location fields to formData
content = content.replace(
  /notes: '',\s*\}\);/,
  `notes: '',\n    google_maps_url: '',\n    latitude: '',\n    longitude: '',\n  });`
);

// 3. Update fetchSuppliers select
content = content.replace(
  /\.select\('id, name, contact_person, phone, email, address, tax_number, notes, active'\)/,
  `.select('id, name, contact_person, phone, email, address, tax_number, notes, active, google_maps_url, latitude, longitude')`
);

// 4. Update openModal state
content = content.replace(
  /notes: supplier\.notes \|\| '',\s*\}\);/,
  `notes: supplier.notes || '',\n        google_maps_url: supplier.google_maps_url || '',\n        latitude: supplier.latitude ? supplier.latitude.toString() : '',\n        longitude: supplier.longitude ? supplier.longitude.toString() : '',\n      });`
);

content = content.replace(
  /notes: '',\s*\}\);\n\s*\}\n\s*setShowModal\(true\);/,
  `notes: '',\n        google_maps_url: '',\n        latitude: '',\n        longitude: '',\n      });\n    }\n    setShowModal(true);`
);

// 5. Add URL extract logic inside component
const urlLogic = `
  const extractCoordsFromUrl = (url: string) => {
    const regex = /@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/;
    const match = url.match(regex);
    if (match) {
      setFormData(prev => ({ ...prev, latitude: match[1], longitude: match[2] }));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, google_maps_url: url });
    extractCoordsFromUrl(url);
  };
`;
content = content.replace(/const openModal =/, `${urlLogic}\n  const openModal =`);

// 6. Update handleSubmit payload to parse floats
content = content.replace(
  /const \{ error \} = await supabase\n\s*\.from\('suppliers'\)\n\s*\.update\(formData\)/,
  `const payload = { ...formData, latitude: formData.latitude ? parseFloat(formData.latitude) : null, longitude: formData.longitude ? parseFloat(formData.longitude) : null };\n        const { error } = await supabase\n          .from('suppliers')\n          .update(payload)`
);
content = content.replace(
  /const \{ error \} = await supabase\.from\('suppliers'\)\.insert\(\[formData\]\);/,
  `const payload = { ...formData, latitude: formData.latitude ? parseFloat(formData.latitude) : null, longitude: formData.longitude ? parseFloat(formData.longitude) : null };\n        const { error } = await supabase.from('suppliers').insert([payload]);`
);

// 7. Update Table Headers
content = content.replace(
  /<th>\{t\('suppliers\.email'\)\}<\/th>/,
  `<th>{t('suppliers.email')}</th>\n                <th>{language === 'ar' ? Buffer.from('2KfZhNi52YbZiNin2YY=', 'base64').toString('utf8') : 'Address'}</th>\n                <th>{language === 'ar' ? Buffer.from('2KfZhNmF2YjZgti5', 'base64').toString('utf8') : 'Location'}</th>`
);

// 8. Update Table Body
const locationCellStr = `
                      <td>
                          <span style={{ fontSize: '0.875rem' }}>{supplier.address ? supplier.address : (language === 'ar' ? Buffer.from('2LrZitixINmF2K3Yrdiv', 'base64').toString('utf8') : 'Not set')}</span>
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
                                  {language === 'ar' ? Buffer.from('2YHYqtitINin2YTZhdmI2YLYuQ==', 'base64').toString('utf8') : 'Open Location'}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={16} />
                                  {language === 'ar' ? Buffer.from('2KfZhNmF2YjZgti5INi62YrYsSDZhdiv2K8=', 'base64').toString('utf8') : 'Location not set'}
                                </span>
                              );
                          })()}
                      </td>`;

content = content.replace(
  /<td>\{supplier\.email\}<\/td>/,
  `<td>{supplier.email}</td>${locationCellStr}`
);

// 9. Add Location Section to Modal
const locationSection = `
                {/* Location Section */}
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    {language === 'ar' ? Buffer.from('2KrZgdin2LXZitmEINin2YTZhdmI2YLYuQ==', 'base64').toString('utf8') : 'Location Details'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                        {language === 'ar' ? Buffer.from('2KfZhNi52YbZiNin2YY=', 'base64').toString('utf8') : 'Address'}
                      </label>
                      <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} placeholder="e.g. Main Office, Riyadh" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                        {language === 'ar' ? Buffer.from('2LHYp9io2Lcg2K7Ysdin2KbLtyDYrNmI2KzZhA==', 'base64').toString('utf8') : 'Google Maps URL'}
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="url" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} placeholder="https://maps.google.com/?q=..." value={formData.google_maps_url} onChange={handleUrlChange} />
                      </div>
                    </div>
                  </div>
                </div>`;

content = content.replace(
  /<div>\s*<label className="form-label">\{t\('suppliers\.notes'\)\}<\/label>/,
  `${locationSection}\n                <div>\n                  <label className="form-label">{t('suppliers.notes')}</label>`
);

// Remove the old address field from earlier in the form, as it's now in the Location section.
content = content.replace(
  /<div>\s*<label className="form-label">\{t\('suppliers\.address'\)\}<\/label>\s*<textarea[^>]+value=\{formData\.address\}[^>]+>\s*<\/textarea>\s*<\/div>/g,
  ''
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully updated SuppliersList.tsx');
