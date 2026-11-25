import React from 'react';

export function BrandMark({
  dark = false,
  size = 'md',
}: {
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize = size === 'lg' ? 38 : size === 'sm' ? 24 : 30;
  const textSize =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="lt-grad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="32"
          height="32"
          rx="10"
          fill={dark ? 'rgba(14,165,233,0.14)' : '#F0F9FF'}
          stroke="url(#lt-grad)"
          strokeWidth="1.5"
        />
        <circle cx="18" cy="10.5" r="2.6" stroke="url(#lt-grad)" strokeWidth="1.8" />
        <path
          d="M12.5 17.5C12.5 15.8 14.9 14.8 18 14.8C21.1 14.8 23.5 15.8 23.5 17.5V21.5C23.5 22.3 22.8 23 22 23H20.5V28.5C20.5 29.3 19.8 30 19 30H17C16.2 30 15.5 29.3 15.5 28.5V23H14C13.2 23 12.5 22.3 12.5 21.5V17.5Z"
          stroke="url(#lt-grad)"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 19H16.6L17.6 17.2L18.8 20.6L19.8 19H21.5"
          stroke="#06B6D4"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`font-display font-bold tracking-tight ${textSize} ${
          dark ? 'text-white' : 'text-[#0B1D39]'
        }`}
      >
        LifeTwin <span className="text-sky-500">AI</span>
      </span>
    </span>
  );
}
