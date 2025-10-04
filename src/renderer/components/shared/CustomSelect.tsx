import React, { useState, useEffect, useRef } from 'react';

interface CustomSelectProps {
  value: string | number;
  options: { value: string | number; label: string }[] | string[];
  placeholder?: string;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Custom dropdown component that fixes positioning issues with native HTML select elements.
 * Uses absolute positioning to ensure dropdowns appear below the select button regardless of screen size.
 * Based on the working ColumnSelect component from ChartSlicerControls.tsx.
 */
const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  placeholder = "Select option...",
  onChange,
  disabled = false,
  style,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to always have value/label structure
  const normalizedOptions = options.map(option =>
    typeof option === 'string' ? { value: option, label: option } : option
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    // Close dropdown if value was reset programmatically
    setIsOpen(false);
  }, [value, disabled]);

  const isDisabled = disabled || normalizedOptions.length === 0;

  useEffect(() => {
    if (isDisabled) {
      setIsOpen(false);
    }
  }, [isDisabled]);

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const selectedLabel = selectedOption ? selectedOption.label : placeholder;

  const defaultStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    ...style
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} className={className}>
      <button
        type="button"
        onClick={() => {
          if (isDisabled) return;
          setIsOpen(prev => !prev);
        }}
        style={{
          ...defaultStyle,
          color: isDisabled ? '#9ca3af' : (value ? '#111827' : '#6b7280'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left'
          }}
        >
          {selectedLabel}
        </span>
        <span style={{ marginLeft: '8px', fontSize: '12px', color: isDisabled ? '#9ca3af' : '#6b7280' }}>
          {isDisabled ? '─' : (isOpen ? '▲' : '▼')}
        </span>
      </button>

      {isOpen && !isDisabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)', // Key fix: positions dropdown below button
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
            zIndex: 1000, // High z-index to appear above other elements
            maxHeight: '220px',
            overflowY: 'auto'
          }}
        >
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: value === '' ? '#eff6ff' : 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#111827'
              }}
            >
              {placeholder}
            </button>
          )}
          {normalizedOptions.map(option => {
            const isActive = value === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: isActive ? '#eff6ff' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isActive && <span style={{ color: '#2563eb' }}>✔</span>}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {option.label}
                </span>
              </button>
            );
          })}

          {normalizedOptions.length === 0 && (
            <div
              style={{
                padding: '12px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
              }}
            >
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;