import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Replace initial states of formData.brand_id with formData.brand_name
content = content.replace(/brand_id: '',/g, `brand_name: '',`);

// 2. Replace brand_id: product.brand_id || '' with brand_name: product.brand?.name || ''
content = content.replace(/brand_id: product\.brand_id \|\| '',/g, `brand_name: product.brand?.name || '',`);

// 3. Insert brand creation logic before updating/inserting products
const submitLogicRegex = /if \(editingId\) \{/;
const brandResolutionLogic = `let finalBrandId = null;
      if (formData.brand_name && formData.brand_name.trim() !== '') {
        const searchName = formData.brand_name.trim();
        const { data: existingBrands, error: existingError } = await supabase.from('brands').select('id, name').ilike('name', searchName);
        if (existingError) throw existingError;
        if (existingBrands && existingBrands.length > 0) {
          finalBrandId = existingBrands[0].id;
        } else {
          const { data: newBrand, error: newBrandError } = await supabase.from('brands').insert({ name: searchName, active: true }).select('id').single();
          if (newBrandError) {
             const { data: existingRace } = await supabase.from('brands').select('id, name').ilike('name', searchName);
             if (existingRace && existingRace.length > 0) {
                finalBrandId = existingRace[0].id;
             } else {
                throw newBrandError;
             }
          } else {
             finalBrandId = newBrand.id;
          }
        }
      }

      if (editingId) {`;

content = content.replace(submitLogicRegex, brandResolutionLogic);

// 4. Update the update/insert objects to use finalBrandId
content = content.replace(/brand_id: formData\.brand_id \|\| null,/g, `brand_id: finalBrandId,`);

// 5. Replace LOVSelect in JSX with simple input
const jsxRegex = /<label htmlFor="brand_id"[\s\S]*?<\/LOVSelect>\s*<\/div>/;
const newJsx = `<label htmlFor="brand_name" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.brand')}</label>
                      <input
                        id="brand_name"
                        name="brand_name"
                        type="text"
                        value={formData.brand_name}
                        onChange={handleInputChange}
                        placeholder={t('products.brand')}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>`;

content = content.replace(jsxRegex, newJsx);

fs.writeFileSync(targetFile, content);
console.log('Refactored brand logic in ProductsList.tsx successfully.');
