import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('src/pages/products/ProductsList.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const regex = /\{hasPermission\('products\.update'\) && \([\s\S]*?<\/button>\s*\)\}\s*<\/td>/;
const replacement = `{hasPermission('products.update') && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', marginRight: '4px' }} 
                        onClick={() => openModal(product)}
                        title={t('products.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {hasPermission('products.update') && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', marginRight: '4px' }} 
                        onClick={() => navigate('/inventory?product_id=' + product.id)}
                        title={t('products.manageStock')}
                      >
                        <Package size={16} />
                      </button>
                    )}
                    {hasPermission('products.delete') && (
                      <button 
                        type="button"
                        className="btn btn-danger" 
                        style={{ padding: '6px' }} 
                        onClick={() => confirmDeleteClick(product.id)}
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>`;

content = content.replace(regex, replacement);
fs.writeFileSync(targetFile, content);
