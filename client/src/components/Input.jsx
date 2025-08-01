import React from 'react';

export const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow shadow-sm ${className}`}
    {...props}
  />
);