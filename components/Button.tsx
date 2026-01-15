'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  loading?: boolean;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  loading = false,
  disabled,
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'w-full py-4 px-6 rounded-lg font-bold text-lg tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-gold to-gold-dark text-primary hover:shadow-lg hover:shadow-gold/50',
    outline: 'border-2 border-gold text-gold hover:bg-gold hover:text-primary',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-t-transparent border-current rounded-full animate-spin" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}