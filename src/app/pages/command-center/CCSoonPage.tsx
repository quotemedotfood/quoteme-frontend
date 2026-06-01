// CCSoonPage — shared "this view lands shortly" placeholder.
// Used for: cc/assign, cc/search, cc/team, cc/inbound.
// No sidebar dead-ends.

import React from 'react';
import { sans, serif, C } from '../../components/distributor-admin/command-center/cc-atoms';

interface CCSoonPageProps {
  title?: string;
}

export function CCSoonPage({ title = 'This view lands shortly.' }: CCSoonPageProps) {
  return (
    <div
      style={{
        paddingTop: 64,
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <p
        style={{
          ...serif,
          fontSize: 22,
          fontWeight: 500,
          color: C.charcoal,
          lineHeight: 1.3,
        }}
      >
        {title}
      </p>
      <p
        style={{
          ...sans,
          fontSize: 13.5,
          color: C.gray500,
          marginTop: 12,
          lineHeight: 1.6,
        }}
      >
        This section of the Command Center is being built. Check back soon.
      </p>
    </div>
  );
}
