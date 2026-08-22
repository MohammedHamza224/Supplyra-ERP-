import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface LOVOption {
  id: string;
  name: string;
  code?: string;
}

interface LOVSelectProps {
  options: LOVOption[];
  value: string | string[]; // string for single, array for multiple
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

const LOVSelect: React.FC<LOVSelectProps> = ({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (opt.code && opt.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (optionId: string) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      if (currentValue.includes(optionId)) {
        onChange(currentValue.filter(id => id !== optionId));
      } else {
        onChange([...currentValue, optionId]);
      }
    } else {
      onChange(optionId);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleRemove = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple && Array.isArray(value)) {
      onChange(value.filter(id => id !== optionId));
    }
  };

  const getDisplayValue = () => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return <span style={{ color: '#9ca3af' }}>{placeholder}</span>;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {value.map(id => {
            const opt = options.find(o => o.id === id);
            if (!opt) return null;
            return (
              <span key={id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                backgroundColor: 'var(--color-primary)', color: 'white',
                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem'
              }}>
                {opt.name}
                <button type="button" onClick={(e) => handleRemove(id, e)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'white' }}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      );
    } else {
      if (!value) return <span style={{ color: '#9ca3af' }}>{placeholder}</span>;
      const opt = options.find(o => o.id === value);
      return opt ? (opt.code ? `${opt.name} (${opt.code})` : opt.name) : <span style={{ color: '#9ca3af' }}>{placeholder}</span>;
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%', minHeight: '38px', padding: '6px 10px',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          backgroundColor: disabled ? 'var(--color-surface-hover)' : 'var(--color-background)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {getDisplayValue()}
        </div>
        <ChevronDown size={16} color="#6b7280" style={{ flexShrink: 0, marginLeft: '8px' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: '4px', backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxHeight: '250px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%', padding: '6px 8px 6px 28px',
                  border: '1px solid var(--color-border)', borderRadius: '4px',
                  fontSize: '0.8rem', outline: 'none'
                }}
              />
            </div>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = multiple 
                  ? Array.isArray(value) && value.includes(opt.id)
                  : value === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: isSelected ? 'var(--color-primary-light, #eff6ff)' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'inherit',
                      fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{opt.code ? `${opt.name} (${opt.code})` : opt.name}</span>
                    {isSelected && <Check size={14} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LOVSelect;
