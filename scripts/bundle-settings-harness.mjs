import { build } from 'esbuild';

const res = await build({
  stdin: {
    contents: `
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import SettingsPage from './src/app/admin/settings/page';
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(SettingsPage));
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  write: false,
});

console.log('Bundle success, size bytes:', res.outputFiles[0].text.length);
