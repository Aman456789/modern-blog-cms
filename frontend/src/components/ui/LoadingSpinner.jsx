import React from 'react';

export default function LoadingSpinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M22 12a10 10 0 00-10-10" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
