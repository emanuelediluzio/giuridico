declare module 'react-quill' {
  import * as React from 'react';

  interface ReactQuillProps {
    value?: string;
    onChange?: (content: string, delta: any, source: string, editor: any) => void;
    readOnly?: boolean;
    theme?: string;
    modules?: any;
    formats?: string[];
    style?: React.CSSProperties;
    className?: string;
    placeholder?: string;
    // Aggiungi altre props se necessario
  }

  const ReactQuill: React.ComponentType<ReactQuillProps>;
  export default ReactQuill;
} 