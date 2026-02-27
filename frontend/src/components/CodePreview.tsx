'use client';

import { SandpackLayout, SandpackPreview, SandpackCodeEditor, SandpackProvider, SandpackFileExplorer } from '@codesandbox/sandpack-react';

interface CodePreviewProps {
  files: Record<string, string | { code: string }>;
  mode: 'preview' | 'code';
}

// Custom index.html with Tailwind CDN Play script
const TAILWIND_INDEX_HTML = `<!DOCTYPE html>
<html lang="en" style="background-color: #09090b;">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'neon-green': '#39FF14',
                        'electric-blue': '#00D9FF',
                    },
                },
            },
        };
    </script>
    <style>
        html, body, #root {
            margin: 0;
            padding: 0;
            background-color: #09090b !important;
            color: #fafafa;
            font-family: system-ui, -apple-system, sans-serif;
            min-height: 100%;
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #18181b; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
    </style>
</head>
<body>
    <div id="root" style="background-color: #09090b; min-height: 100vh;"></div>
</body>
</html>`;

const MINIMAL_CSS = `/* Tailwind loaded via CDN */`;

// Files to skip entirely
const FILES_TO_SKIP = [
  '/index.html', '/vite.config.ts', '/postcss.config.js', '/tailwind.config.js',
  '/tsconfig.json', '/src/main.tsx', '/main.tsx', 'index.html', 'vite.config.ts',
  'src/main.tsx', 'main.tsx', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js'
];

export default function CodePreview({ files, mode }: CodePreviewProps) {
  console.log('[CodePreview] Raw input files:', Object.keys(files));

  const sandpackFiles: Record<string, string> = {};
  let appContent: string | null = null;

  // =====================================================
  // STEP 1: Find App.tsx/App.jsx FIRST before any other processing
  // =====================================================
  Object.entries(files).forEach(([path, content]) => {
    const code = typeof content === 'string' ? content : content?.code || '';
    const lowerPath = path.toLowerCase();

    // Look for any variation of App file
    if (lowerPath.includes('app.tsx') || lowerPath.includes('app.jsx')) {
      if (!lowerPath.includes('config') && code.includes('export default')) {
        console.log(`[CodePreview] Found App file: ${path}`);
        appContent = code;
      }
    }
  });

  // =====================================================
  // STEP 2: Process all files with path normalization
  // =====================================================
  Object.entries(files).forEach(([path, content]) => {
    const code = typeof content === 'string' ? content : content?.code || '';

    // Skip empty content
    if (!code || code.trim() === '') {
      console.log(`[CodePreview] Skipping empty file: ${path}`);
      return;
    }

    // Normalize path - fix /src/ prefix while preserving folder structure
    let normalizedPath = path;

    // Ensure path starts with /
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }

    // Remove /src/ prefix but keep the rest of the path
    // /src/components/X.tsx -> /components/X.tsx
    // /src/App.tsx -> /App.tsx
    if (normalizedPath.startsWith('/src/')) {
      normalizedPath = normalizedPath.slice(4); // Remove '/src' (keeps leading /)
    }

    console.log(`[CodePreview] Path: ${path} -> ${normalizedPath}`);

    // Skip config files
    if (FILES_TO_SKIP.some(skip => path.includes(skip) || normalizedPath.includes(skip))) {
      console.log(`[CodePreview] Skipping config: ${path}`);
      return;
    }

    // Skip .js/.jsx files (we want .tsx only)
    if (normalizedPath.endsWith('.js') || normalizedPath.endsWith('.jsx')) {
      if (!normalizedPath.includes('config')) {
        console.log(`[CodePreview] Skipping JS file: ${path}`);
        return;
      }
    }

    // Skip CSS files (we inject our own)
    if (normalizedPath.endsWith('.css')) {
      console.log(`[CodePreview] Skipping CSS file: ${path}`);
      return;
    }

    // Skip duplicate App files (we handle App separately)
    const lowerNorm = normalizedPath.toLowerCase();
    if (lowerNorm.includes('/app.tsx') || lowerNorm.includes('/app.jsx')) {
      // Skip - we'll add App.tsx from appContent later
      console.log(`[CodePreview] Deferring App file: ${path}`);
      return;
    }

    sandpackFiles[normalizedPath] = code;
  });

  console.log('[CodePreview] After initial processing:', Object.keys(sandpackFiles));

  // =====================================================
  // STEP 3: Add App.tsx (the most critical file)
  // =====================================================
  if (appContent) {
    // Clean up the App content - use explicit string type
    let cleanApp: string = appContent as string;

    // Remove CSS imports
    cleanApp = cleanApp.replace(/import\s+['"][^'"]*\.css['"];?\s*\n?/g, '');

    // Fix import paths: ../hooks -> ./hooks (for root level App)
    cleanApp = cleanApp.replace(/from\s+['"]\.\.\/(hooks|components|utils|types)\//g, "from './$1/");
    cleanApp = cleanApp.replace(/from\s+['"]\.\.\/(types)['"]/g, "from './$1'");

    sandpackFiles['/App.tsx'] = cleanApp;
    console.log('[CodePreview] Added /App.tsx from found content');
  } else {
    // Fallback error component
    console.error('[CodePreview] No App.tsx found in generated files!');
    sandpackFiles['/App.tsx'] = `export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Error: No App.tsx Generated</h1>
        <p className="text-zinc-400">The AI did not generate a valid App.tsx file.</p>
        <p className="text-zinc-500 text-sm mt-4">Check the console for more details.</p>
      </div>
    </div>
  );
}`;
  }

  // =====================================================
  // STEP 4: Fix imports in all component files
  // =====================================================
  Object.keys(sandpackFiles).forEach(filePath => {
    if (filePath === '/App.tsx') return; // Already handled
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = sandpackFiles[filePath];
    const isInSubfolder = filePath.split('/').filter(Boolean).length > 1;

    if (isInSubfolder) {
      // Files in /components/, /hooks/ etc need ../X for sibling folders
      content = content.replace(/from\s+['"]\.\/hooks\//g, "from '../hooks/");
      content = content.replace(/from\s+['"]\.\/types/g, "from '../types");
      content = content.replace(/from\s+['"]\.\/components\//g, "from '../components/");
    }

    // Remove CSS imports from all files
    content = content.replace(/import\s+['"][^'"]*\.css['"];?\s*\n?/g, '');

    sandpackFiles[filePath] = content;
  });

  // =====================================================
  // STEP 5: Ensure types file exists if needed
  // =====================================================
  const hasTypesFile = Object.keys(sandpackFiles).some(p => p.includes('/types'));
  const usesTypes = Object.values(sandpackFiles).some(code =>
    typeof code === 'string' && (code.includes('SessionMode') || code.includes(': Task') || code.includes('TimerState'))
  );

  if (!hasTypesFile && usesTypes) {
    const typesContent = `export type SessionMode = 'focus' | 'shortBreak' | 'longBreak';
export interface Task { id: string; text: string; completed: boolean; createdAt: number; }
export interface TimerState { sessionMode: SessionMode; timeRemaining: number; isRunning: boolean; isPaused: boolean; }`;
    sandpackFiles['/types.ts'] = typesContent;
    sandpackFiles['/types/index.ts'] = typesContent;
  }

  // =====================================================
  // STEP 6: Inject Tailwind CSS infrastructure
  // =====================================================
  sandpackFiles['/public/index.html'] = TAILWIND_INDEX_HTML;
  sandpackFiles['/index.css'] = MINIMAL_CSS;

  console.log('[CodePreview] Final files:', Object.keys(sandpackFiles));

  // Lucid dark theme
  const lucidTheme = {
    colors: {
      surface1: '#050505', surface2: '#0a0a0a', surface3: '#111111',
      clickable: '#a1a1aa', base: '#ffffff', disabled: '#71717a',
      hover: '#22c55e', accent: '#22c55e', error: '#ef4444', errorSurface: '#7f1d1d',
    },
    syntax: {
      plain: '#d4d4d8',
      comment: { color: '#71717a', fontStyle: 'italic' as const },
      keyword: '#22c55e', tag: '#22c55e', punctuation: '#a1a1aa',
      definition: '#60a5fa', property: '#facc15', static: '#f472b6', string: '#34d399',
    },
    font: {
      body: '"Inter", system-ui, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
      size: '13px', lineHeight: '1.6',
    },
  };

  const sandpackFormattedFiles: Record<string, { code: string; active?: boolean }> = {};
  Object.entries(sandpackFiles).forEach(([path, code]) => {
    sandpackFormattedFiles[path] = { code, active: path === '/App.tsx' };
  });

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--lucid-bg)' }}>
      <SandpackProvider
        template="react-ts"
        theme={lucidTheme}
        files={sandpackFormattedFiles}
        customSetup={{
          dependencies: { 'lucide-react': 'latest' },
        }}
        options={{
          activeFile: '/App.tsx',
          externalResources: ['https://cdn.tailwindcss.com'],
        }}
      >
        <SandpackLayout style={{ height: '100%', border: 'none', background: 'var(--lucid-bg)' }}>
          <div style={{ display: mode === 'preview' ? 'flex' : 'none', flex: 1, height: '100%', width: '100%' }}>
            <SandpackPreview showNavigator={true} showRefreshButton={true} showOpenInCodeSandbox={false} style={{ height: '100%', flex: 1 }} />
          </div>
          <div style={{ display: mode === 'code' ? 'flex' : 'none', flex: 1, height: '100%', width: '100%' }}>
            <SandpackFileExplorer style={{ height: '100%', minWidth: '180px', maxWidth: '220px', background: 'var(--lucid-bg-secondary)', borderRight: '1px solid var(--lucid-border)' }} />
            <SandpackCodeEditor showTabs={false} showLineNumbers={true} showInlineErrors={true} wrapContent={true} readOnly={true} style={{ height: '100%', flex: 1 }} />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
