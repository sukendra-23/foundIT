import React from 'react';

/** Wraps page content with proper top padding (below navbar) and optional max-width centering */
const PageContainer = ({ children, maxWidth = 'var(--max-width)', style = {} }) => {
  // If maxWidth was passed inside style, extract it so it applies to .container, not .page-wrapper
  const { maxWidth: styleMaxWidth, ...restStyle } = style || {};
  const effectiveMaxWidth = maxWidth !== 'var(--max-width)' ? maxWidth : (styleMaxWidth || 'var(--max-width)');

  return (
    <main
      className="page-wrapper"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...restStyle
      }}
    >
      <div
        className="container"
        style={{
          width: '100%',
          maxWidth: effectiveMaxWidth,
          margin: '0 auto'
        }}
      >
        {children}
      </div>
    </main>
  );
};

export default PageContainer;

