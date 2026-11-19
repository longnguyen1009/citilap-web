import type { ReactNode } from 'react';

export default function LazyBelowFold({
  children,
  minHeight = 360,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  return (
    <div
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${minHeight}px`,
      }}
    >
      {children}
    </div>
  );
}
