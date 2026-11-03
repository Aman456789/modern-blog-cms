import React from 'react';

export default function OutlineButton({ children, className = '', loading = false, ...props }) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-white text-white bg-transparent',
        'hover:bg-[#111111] transition-colors duration-300',
        className,
      ].join(' ')}
      disabled={props.disabled}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2" strokeWidth="2" />
          <path d="M22 12a10 10 0 00-10-10" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
