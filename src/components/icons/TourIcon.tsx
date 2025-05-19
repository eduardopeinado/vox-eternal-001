// src/components/icons/TourIcon.tsx
import * as React from 'react';

export default function TourIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15l-4 2 2-4 4-2-2 4z" />
    </svg>
  );
}