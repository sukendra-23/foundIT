import React from 'react';

/** Wraps page content with proper top padding (below navbar) and optional max-width centering */
const PageContainer = ({ children, maxWidth = 'var(--max-width)', style }) => (
  <main className="page-wrapper" style={style}>
    <div className="container" style={{ maxWidth }}>
      {children}
    </div>
  </main>
);

export default PageContainer;
