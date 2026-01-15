'use client';

import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const postos = [
  { label: 'Selecione...', value: '' },
  { label: 'Coronel', value: 'Coronel' },
  { label: 'Major', value: 'Major' },
  { label: 'Capitão', value: 'Capitão' },
  { label: '1° Tenente', value: '1° Tenente' },
  { label: '2° Tenente', value: '2° Tenente' },
];

export default function Select({ 
  label, 
  error,
  className = '',
  ...props 
}: SelectProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-silver mb-2 text-sm font-semibold tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-primary-light border-2 rounded-lg px-4 py-4 text-silver text-base
          focus:outline-none focus:border-gold transition-colors
          ${error ? 'border-red-500' : 'border-silver-dark'}
          ${className}
        `}
        {...props}
      >
        {postos.map((posto) => (
          <option key={posto.value} value={posto.value}>
            {posto.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-xs mt-1 ml-1">
          {error}
        </p>
      )}
    </div>
  );
}