const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/suppliers/SuppliersList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const injection = `
                {/* Location Section */}
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    {language === 'ar' ? 'تفاصيل الموقع' : 'Location Details'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                        {language === 'ar' ? 'العنوان' : 'Address'}
                      </label>
                      <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} placeholder="e.g. Main Office, Riyadh" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                        {language === 'ar' ? 'رابط خرائط جوجل' : 'Google Maps URL'}
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="url" className="form-input" style={{ padding: '6px 8px', fontSize: '0.875rem' }} placeholder="https://maps.google.com/?q=..." value={formData.google_maps_url} onChange={handleUrlChange} />
                      </div>
                    </div>
                  </div>
                </div>
`;

if (!content.includes('Location Details')) {
  content = content.replace(
    /<\/div>\s*<\/div>\s*<div className="card-footer"/,
    `</div>\n${injection}\n              </div>\n              <div className="card-footer"`
  );
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Fixed Modal form in SuppliersList.tsx');
} else {
  console.log('Location Details already exists.');
}
