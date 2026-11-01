import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Package, CheckCircle, XCircle } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import ProductSuppliers from './ProductSuppliers';
import LOVSelect from '../../components/ui/LOVSelect';

const ProductsList = () => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<any[]>([]);

  // STEP 2: VERIFY React state updates
  useEffect(() => {
    console.log('CURRENT PRODUCTS STATE:', products);
  }, [products]);

  useEffect(() => {
    // DIAGNOSTICS COMPLETE
  }, []);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // {editingId ? t('common.edit') : t('products.newProduct')} states
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const [formError, setFormError] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    category_id: '',
    brand_name: '',
    unit_id: '',
      supplier_ids: [] as string[],
    barcode: '',
    purchase_price: '',
    selling_price: '',
    min_stock: '',
    warehouse_id: '',
    batch_number: '',
    production_date: '',
    expiry_date: '',
    initial_quantity: '',
  });

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearchTerm]);

  
  
    const confirmDeleteClick = (id: string) => {
      setDeleteConfirmId(id);
      setDeleteErrorMsg('');
    };

    const executeDelete = async () => {
      if (!deleteConfirmId) return;
      const id = deleteConfirmId;
      setSaving(true);
      setDeleteErrorMsg('');
      try {
        const [inventoryRes, orderRes, purchaseRes, supplierRes] = await Promise.all([
          supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('product_id', id),
          supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
          supabase.from('purchase_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
          supabase.from('product_suppliers').select('product_id', { count: 'exact', head: true }).eq('product_id', id),
        ]);
        
        const hasDependencies = (inventoryRes.count || 0) > 0 || (orderRes.count || 0) > 0 || (purchaseRes.count || 0) > 0 || (supplierRes.count || 0) > 0;
        
        if (hasDependencies) {
          const { error: softDeleteError } = await supabase.from('products').update({ active: false }).eq('id', id);
          if (softDeleteError) throw softDeleteError;
        } else {
          const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
          if (deleteError) {
            const { error: fallbackError } = await supabase.from('products').update({ active: false }).eq('id', id);
            if (fallbackError) throw fallbackError;
          }
        }
        
        setDeleteConfirmId(null);
        fetchProducts();
      } catch(e: any) {
         setDeleteErrorMsg(e.message);
      } finally {
        setSaving(false);
      }
    };

    const fetchProducts = async () => {
    setLoading(true);
    try {
      // STEP 1: RAW PRODUCTS QUERY
      const { data: rawData, error: rawError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('RAW PRODUCTS:', rawData);
      console.log('RAW PRODUCTS ERROR:', rawError);

      let query = supabase
        .from('products')
        .select(`
          id, product_code, name, purchase_price, selling_price, active, min_stock, barcode,
          category_id, brand_id, unit_id, created_at,
          category:categories(name),
          brand:brands(name),
          unit:units(code),
          product_suppliers(supplier_id, is_preferred, suppliers(name))
        `).eq('active', true)
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,product_code.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error, count } = await query;

      // STEP 6: CHECK FETCH ERROR
      console.log({
        productsData: data,
        productsError: error,
        productsCount: data?.length
      });

      if (error) {
        console.error('PRODUCTS FETCH ERROR:', error);
        setFormError(error.message);
        throw error;
      }
      
      
      console.log('BEFORE setProducts:', data);
      setProducts(data || []);

    } catch (error: any) {
      console.error('Error fetching products:', error);
      setFormError(error?.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [categoriesResult, brandsResult, unitsResult, suppliersResult, warehousesResult] =
        await Promise.all([
          supabase
            .from('categories')
            .select('id, name')
            .eq('active', true)
            .order('name'),

          supabase
            .from('brands')
            .select('id, name')
            .eq('active', true)
            .order('name'),

          supabase
            .from('units')
            .select('id, name, code')
            .eq('active', true)
            .order('name'),

          supabase
            .from('suppliers')
            .select('id, name')
            .eq('active', true)
            .order('name'),
          supabase
            .from('warehouses')
            .select('id, name')
            .eq('active', true)
            .order('name'),
        ]);

     console.log('Categories:', categoriesResult);
console.log('Brands:', brandsResult);
console.log('Units:', unitsResult);

if (categoriesResult.error) {
  console.error('Categories error:', categoriesResult.error);
}

if (brandsResult.error) {
  console.error('Brands error:', brandsResult.error);
}

if (unitsResult.error) {
  console.error('Units error:', unitsResult.error);
}

if (
  categoriesResult.error ||
  brandsResult.error ||
  unitsResult.error
) {
  setFormError('Failed to load product master data. Check console for details.');
  return;
}

      setCategories(categoriesResult.data || []);
      setBrands(brandsResult.data || []);
      setUnits(unitsResult.data || []);
      setSuppliers(suppliersResult.data || []);
      setWarehouses(warehousesResult.data || []);
    } catch (error) {
      console.error('Error fetching product form data:', error);
      setFormError('Failed to load categories, brands, or units.');
    }
  };

  const openModal = async (product?: any) => {
    setFormError('');
    if (product) {
      setEditingId(product.id);
      setFormData({
        product_code: product.product_code || '',
        name: product.name || '',
        category_id: product.category_id || '',
        brand_name: product.brand?.name || '',
        unit_id: product.unit_id || '',
        supplier_ids: product.product_suppliers ? product.product_suppliers.map((ps: any) => ps.supplier_id) : [],
        barcode: product.barcode || '',
        purchase_price: (product.purchase_price ?? 0).toString(),
        selling_price: (product.selling_price ?? 0).toString(),
        min_stock: (product.min_stock ?? 0).toString(),
        warehouse_id: '',
        batch_number: '',
        production_date: '',
        expiry_date: '',
        initial_quantity: '',
      });
    } else {
      setEditingId(null);
      setFormData({
        product_code: '',
        name: '',
        category_id: '',
        brand_name: '',
        unit_id: '',
          supplier_ids: [],
          barcode: '',
        purchase_price: '',
        selling_price: '',
        min_stock: '',
        warehouse_id: '',
        batch_number: '',
        production_date: '',
        expiry_date: '',
        initial_quantity: '',
      });
    }
    setFormError('');

    await fetchFormData();
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setFormError('');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (e.target instanceof HTMLSelectElement && e.target.multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormError('');

    // Basic validation
    if (!formData.product_code.trim()) {
      setFormError('Product Code is required.');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('Product Name is required.');
      return;
    }

    if (!formData.unit_id) {
      setFormError(t('products.selectUnit'));
      return;
    }

    const purchasePrice = Number(formData.purchase_price || 0);
    const sellingPrice = Number(formData.selling_price || 0);
    const minStock = Number(formData.min_stock || 0);

    if (
      Number.isNaN(purchasePrice) ||
      Number.isNaN(sellingPrice) ||
      Number.isNaN(minStock)
    ) {
      setFormError('Please enter valid numeric values for prices and minimum stock.');
      return;
    }

    try {
      setSaving(true);

      // Get currently authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setFormError('Your session has expired. Please login again.');
        return;
      }

      let error;
      let newProduct: any;

      let finalBrandId = null;
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

      if (editingId) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            product_code: formData.product_code.trim(),
            name: formData.name.trim(),
            category_id: formData.category_id || null,
            brand_id: finalBrandId,
            unit_id: formData.unit_id,
            barcode: formData.barcode.trim() || null,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            min_stock: minStock,
            updated_by: user.id,
          })
          .eq('id', editingId);
        error = updateError;
        
        // Update product_suppliers
        if (!error) {
          // First, delete existing ones that are not in formData.supplier_ids
          await supabase.from('product_suppliers').delete().eq('product_id', editingId);
          // Then insert new ones
          if (formData.supplier_ids && formData.supplier_ids.length > 0) {
            const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
              product_id: editingId,
              supplier_id: sId,
              is_preferred: index === 0 // First selected is preferred
            }));
            await supabase.from('product_suppliers').insert(inserts);
          }
        }

      } else {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({
            product_code: formData.product_code.trim(),
            name: formData.name.trim(),
            category_id: formData.category_id || null,
            brand_id: finalBrandId,
            unit_id: formData.unit_id,
            barcode: formData.barcode.trim() || null,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            min_stock: minStock,
            active: true,
            created_by: user.id,
            updated_by: user.id,
          }).select().single();
        error = insertError;
        newProduct = data;
        
        // Insert product_suppliers
        if (!error && newProduct && formData.supplier_ids && formData.supplier_ids.length > 0) {
          console.log('=== SUPPLIER SAVE DEBUG (NEW) ===');
          console.log('FORM SUPPLIER IDS:', formData.supplier_ids);
          console.log('CREATED PRODUCT ID:', newProduct.id);
          const inserts = formData.supplier_ids.map((sId: string, index: number) => ({
            product_id: newProduct.id,
            supplier_id: sId,
            is_preferred: index === 0
          }));
          console.log('SUPPLIER INSERT PAYLOAD:', inserts);
          const { data: psData, error: psError } = await supabase.from('product_suppliers').insert(inserts).select('*');
          console.log('SUPPLIER INSERT DATA:', psData);
          console.log('SUPPLIER INSERT ERROR:', psError);
          if (psError) {
            console.error('PRODUCT SUPPLIER INSERT ERROR:', psError);
            throw new Error(t('products.supplierSaveError') || 'تعذر حفظ المورد المرتبط بالمنتج.');
          }
        }
        
        // Handle initial batch if provided
        if (!error && newProduct) {
          const hasBatchData = formData.initial_quantity || formData.warehouse_id || formData.batch_number || formData.expiry_date;
          
          if (hasBatchData) {
            const isMissingFields = !formData.warehouse_id || !formData.batch_number || !formData.expiry_date || Number(formData.initial_quantity) <= 0;
            
            if (isMissingFields) {
              // Rollback product? We can't easily here without more code, so we just throw to show error.
              throw new Error(`Batch data is incomplete. Warehouse: "${formData.warehouse_id}", Batch: "${formData.batch_number}", Expiry: "${formData.expiry_date}", Qty: "${formData.initial_quantity}"`);
            }
            
            // Insert batch
            const { data: batchData, error: batchError } = await supabase.from('inventory_batches').insert([{
              product_id: newProduct.id,
              warehouse_id: formData.warehouse_id,
              batch_number: formData.batch_number,
              production_date: formData.production_date || null,
              expiry_date: formData.expiry_date,
              quantity: Number(formData.initial_quantity),
              active: true
            }]).select();
            
            if (batchError) {
              throw new Error('Failed to save Inventory Batch to Database: ' + batchError.message);
            }
            
            if (!batchData || batchData.length === 0) {
              throw new Error('Inventory Batch was not created in the database due to an unknown issue (possible RLS or trigger failure).');
            }
          }
        }

        // STEP 10: MOST IMPORTANT TEST
        if (newProduct) {
          console.log('CREATED PRODUCT ID:', newProduct.id);
          const { data: verifyProduct, error: verifyError } = await supabase
            .from('products')
            .select('*')
            .eq('id', newProduct.id)
            .single();
          console.log('VERIFY CREATED PRODUCT:', verifyProduct);
          console.log('VERIFY ERROR:', verifyError);
        }
      }

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('product_code')) {
            setFormError('Product Code already exists.');
          } else if (error.message.includes('barcode')) {
            setFormError('Barcode already exists.');
          } else {
            setFormError('A product with the same unique value already exists.');
          }
        } else {
          setFormError(error.message);
        }

        return;
      }

      // Clear search filter to ensure the new product isn't hidden by an active search
      setSearchTerm('');

      // Refresh products from Supabase
      await fetchProducts();

      // Close modal after successful insert
      setShowModal(false);

      setFormData({
        product_code: '',
        name: '',
        category_id: '',
        brand_name: '',
        unit_id: '',
          supplier_ids: [],
          barcode: '',
        purchase_price: '',
        selling_price: '',
        min_stock: '',
        warehouse_id: '',
        batch_number: '',
        production_date: '',
        expiry_date: '',
        initial_quantity: '',
      });
    } catch (error: any) {
      console.error('Error adding product:', error);
      setFormError(error?.message || 'Failed to add product.');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('products.view')) {
    return <div className="p-6 text-red-500">You do not have permission to view products.</div>;
  }

  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={28} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', margin: 0 }}>
                {t('products.title')}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                {t('products.subtitle')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '240px', maxWidth: '100%' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  right: isRtl ? '12px' : 'auto', 
                  left: isRtl ? 'auto' : '12px', 
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none'
                }} 
              />
              <input
                type="text"
                placeholder={t('common.search') || 'بحث عن منتج...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  paddingRight: isRtl ? '36px' : '12px',
                  paddingLeft: isRtl ? '12px' : '36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  minHeight: '38px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {hasPermission('products.create') && (
              <button
                className="btn btn-primary"
                onClick={() => openModal()}
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '38px', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                {t('products.newProduct')}
              </button>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0, textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)', textAlign: isRtl ? 'right' : 'left' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('products.code')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('products.name')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('products.category')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('products.brand')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('products.supplier')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('products.price')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('products.status')}</th>
                <th style={{ padding: '10px 14px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>{t('products.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontFamily: 'monospace', 
                      backgroundColor: 'var(--color-background)', 
                      border: '1px solid var(--color-border)',
                      padding: '3px 8px', 
                      borderRadius: '4px',
                      color: 'var(--color-text-primary)'
                    }}>
                      {product.product_code}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                    {product.name}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {product.category?.name || '-'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {product.brand?.name || '-'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {(() => {
                      const ps = product.product_suppliers || [];
                      if (ps.length === 0) return '-';
                      const primary = ps.find((s: any) => s.is_preferred) || ps[0];
                      const name = primary?.suppliers?.name || '-';
                      return ps.length > 1 ? `${name} +${ps.length - 1}` : name;
                    })()}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {Number(product.selling_price).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginInlineStart: '4px' }}>
                      {t('products.currency')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: product.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: product.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: product.active ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' }} />
                      {product.active ? t('products.active') : t('products.inactive')}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', textAlign: isRtl ? 'left' : 'right' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'nowrap',
                      verticalAlign: 'middle'
                    }}>
                      {hasPermission('products.update') && (
                        <button 
                          type="button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => navigate('/inventory?product_id=' + product.id)}
                          title={t('products.manageStock')}
                        >
                          <Package size={15} />
                        </button>
                      )}
                      {hasPermission('products.update') && (
                        <button 
                          type="button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => openModal(product)}
                          title={t('products.edit')}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {hasPermission('products.delete') && (
                        <button 
                          type="button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: 'rgb(239, 68, 68)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => confirmDeleteClick(product.id)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {t('products.noProducts')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('common.confirmDelete')}</h3>
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
                  هل أنت متأكد من حذف هذا المنتج؟
                </p>
                {deleteErrorMsg && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
                    {deleteErrorMsg}
                  </div>
                )}
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)} disabled={saving}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-danger" onClick={executeDelete} disabled={saving}>
                  {saving ? t('common.loading') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{editingId ? t('products.edit') : t('products.newProduct')}</h3>
              <button onClick={closeModal} className="btn btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddProduct}>
              <div
                className="card-body"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px 20px',
                }}
              >
                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#b91c1c',
                      fontSize: '0.85rem',
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* Row 1: Name & Code */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                  <div>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.name')} *</label>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t('products.placeholderName')}
                      required
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="product_code" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.code')} *</label>
                    <input
                      id="product_code"
                      name="product_code"
                      value={formData.product_code}
                      onChange={handleInputChange}
                      placeholder={t('products.placeholderCode')}
                      required
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Row 2: Category, Brand, Unit, Supplier */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
                  <div>
                    <label htmlFor="category_id" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.category')}</label>
                    <LOVSelect
                      options={categories}
                      value={formData.category_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, category_id: val }))}
                      placeholder={t('products.selectCategory')}
                      searchPlaceholder={t('common.search')}
                    />
                  </div>
                  <div>
                    <label htmlFor="brand_name" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.brand')}</label>
                      <input
                        id="brand_name"
                        name="brand_name"
                        type="text"
                        value={formData.brand_name}
                        onChange={handleInputChange}
                        placeholder={t('products.brand')}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }}
                      />
                  </div>
                  <div>
                    <label htmlFor="supplier_ids" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.supplier')}</label>
                    <LOVSelect
                      options={suppliers}
                      value={formData.supplier_ids && formData.supplier_ids.length > 0 ? formData.supplier_ids[0] : ''}
                      onChange={(val) => setFormData(prev => ({ ...prev, supplier_ids: val ? [val] : [] }))}
                      placeholder={suppliers.length === 0 ? (t('products.noSuppliers') || 'لا يوجد موردون') : (t('products.selectSupplier') || 'اختر المورد')}
                      searchPlaceholder={t('common.search') || 'بحث...'}
                      disabled={suppliers.length === 0}
                    />
                  </div>
                  <div>
                    <label htmlFor="unit_id" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.unit')} *</label>
                    <LOVSelect
                      options={units}
                      value={formData.unit_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, unit_id: val }))}
                      placeholder={t('products.selectUnit')}
                      searchPlaceholder={t('common.search')}
                    />
                  </div>
                </div>

                {/* Row 3: Prices & Min Stock */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '12px' }}>
                  <div>
                    <label htmlFor="purchase_price" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>Cost</label>
                    <input
                      id="purchase_price"
                      name="purchase_price"
                      type="number" min="0" step="0.01"
                      value={formData.purchase_price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="selling_price" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.sellingPrice')}</label>
                    <input
                      id="selling_price"
                      name="selling_price"
                      type="number" min="0" step="0.01"
                      value={formData.selling_price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="min_stock" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.minStock')}</label>
                    <input
                      id="min_stock"
                      name="min_stock"
                      type="number" min="0" step="0.01"
                      value={formData.min_stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="barcode" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{t('products.barcode')}</label>
                    <input
                      id="barcode"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Rows 4 & 5: Initial Stock Workflow (ONLY FOR NEW PRODUCTS) */}
                {!editingId && (
                  <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{t('products.initialStock')}</h5>
                    
                    {/* Row 4: Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>
                          📅 Production Date
                        </label>
                        <input
                          type="date"
                          name="production_date"
                          value={formData.production_date}
                          onChange={handleInputChange}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>
                          📅 Expiry Date
                        </label>
                        <input
                          type="date"
                          name="expiry_date"
                          value={formData.expiry_date}
                          onChange={handleInputChange}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Row 5: Batch info */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>{t('products.warehouse')}</label>
                        <select
                          name="warehouse_id" value={formData.warehouse_id} onChange={(e) => setFormData(prev => ({...prev, warehouse_id: e.target.value}))}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--color-background)' }}
                        >
                          <option value="">Select...</option>
                          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>{t('products.batchNumber')}</label>
                        <input
                          type="text"
                          name="batch_number" value={formData.batch_number} onChange={(e) => setFormData(prev => ({...prev, batch_number: e.target.value}))}
                          placeholder="BATCH-001"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', display: 'block' }}>{t('products.initialQuantity')}</label>
                        <input
                          type="number"
                          name="initial_quantity" value={formData.initial_quantity} onChange={(e) => setFormData(prev => ({...prev, initial_quantity: e.target.value}))}
                          min="0"
                          placeholder="0"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div
                className="card-footer"
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  padding: '16px',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
