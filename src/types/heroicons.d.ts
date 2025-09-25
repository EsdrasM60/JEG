declare module '@heroicons/react/24/outline/*' {
  import * as React from 'react';
  const Icon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }>; 
  export default Icon;
}

declare module '@heroicons/react/24/solid/*' {
  import * as React from 'react';
  const Icon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }>; 
  export default Icon;
}

// Keep backwards-compatible declarations for the package root (optional)
declare module '@heroicons/react/24/outline' {
  const content: any;
  export default content;
}

declare module '@heroicons/react/24/solid' {
  const content: any;
  export default content;
}
