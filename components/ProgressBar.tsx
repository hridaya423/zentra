import React from 'react';

interface ProgressBarProps {
  value: number; 
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'loading' | 'success' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };
  
  const variantClasses = {
    default: 'progress-bar',
    loading: 'progress-bar progress-loading',
    success: 'progress-bar progress-success',
    error: 'progress-bar progress-error'
  };
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm font-medium text-gray-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={`progress-container ${sizeClasses[size]}`}>
        <div 
          className={`${variantClasses[variant]} ${!animated ? 'transition-none' : ''}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || `Progress: ${Math.round(percentage)}%`}
        />
      </div>
    </div>
  );
} 