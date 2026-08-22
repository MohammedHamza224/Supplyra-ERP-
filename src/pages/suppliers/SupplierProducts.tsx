import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/LanguageContext';

interface SupplierProductsProps {
  supplierId: string;
}

const SupplierProducts: React.FC<SupplierProductsProps> = ({ supplierId }) => {
  const { t } = useTranslation();
  const [suppliedProducts, setSuppliedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supplierId) {
      fetchSuppliedProducts();
    }
  }, [supplierId]);

  const fetchSuppliedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select(`
          *,
          product:products(name, product_code, active)
        `)
        .eq('supplier_id', supplierId)
        .order('is_preferred', { ascending: false });

      if (error) throw error;
      setSuppliedProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching supplied products:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ marginTop: '24px', borderTop: '2px solid var(--color-border)', paddingTop: '20px' }}>
      <h4 style={{ margin: '0 0 16px 0' }}>{t('product_suppliers.suppliedProducts')}</h4>
      
      {suppliedProducts.length > 0 ? (
        <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px' }}>{t('products.name')}</th>
              <th style={{ padding: '8px' }}>{t('products.code')}</th>
              <th style={{ padding: '8px' }}>{t('product_suppliers.purchasePrice')}</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>{t('product_suppliers.primarySupplier')}</th>
            </tr>
          </thead>
          <tbody>
            {suppliedProducts.map(ps => (
              <tr key={ps.product_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px', fontWeight: 500 }}>{ps.product?.name}</td>
                <td style={{ padding: '8px' }}>{ps.product?.product_code || '-'}</td>
                <td style={{ padding: '8px', direction: 'ltr', textAlign: 'left' }}>
                  {ps.purchase_price != null ? `${Number(ps.purchase_price).toFixed(2)} ${t('products.currency')}` : '-'}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {ps.is_preferred ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{t('common.yes') || 'Yes'}</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {t('product_suppliers.noSuppliers')}
        </div>
      )}
    </div>
  );
};

export default SupplierProducts;
