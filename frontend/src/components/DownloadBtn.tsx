'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Loader2 } from 'lucide-react';

interface DownloadBtnProps {
    files: Record<string, string | { code: string }>;
}

// Complete project scaffolding files
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lucid Project</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

const MAIN_TSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);`;

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
    margin: 0;
    padding: 0;
}`;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
});`;

const TSCONFIG = `{
    "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": true,
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx",
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
}`;

const TSCONFIG_NODE = `{
    "compilerOptions": {
        "composite": true,
        "skipLibCheck": true,
        "module": "ESNext",
        "moduleResolution": "bundler",
        "allowSyntheticDefaultImports": true
    },
    "include": ["vite.config.ts"]
}`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [],
};`;

const POSTCSS_CONFIG = `export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};`;

// Enhanced package.json with all dev dependencies
const getPackageJson = (existingPkg: string | undefined) => {
    try {
        const parsed = existingPkg ? JSON.parse(existingPkg) : {};
        return JSON.stringify({
            name: "lucid-project",
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
                dev: "vite",
                build: "tsc && vite build",
                preview: "vite preview"
            },
            dependencies: {
                react: "^18.2.0",
                "react-dom": "^18.2.0",
                "lucide-react": "^0.263.1",
                ...parsed.dependencies
            },
            devDependencies: {
                "@types/react": "^18.2.15",
                "@types/react-dom": "^18.2.7",
                "@vitejs/plugin-react": "^4.0.3",
                autoprefixer: "^10.4.14",
                postcss: "^8.4.27",
                tailwindcss: "^3.3.3",
                typescript: "^5.0.2",
                vite: "^4.4.5"
            }
        }, null, 2);
    } catch {
        return JSON.stringify({
            name: "lucid-project",
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
                dev: "vite",
                build: "tsc && vite build",
                preview: "vite preview"
            },
            dependencies: {
                react: "^18.2.0",
                "react-dom": "^18.2.0",
                "lucide-react": "^0.263.1"
            },
            devDependencies: {
                "@types/react": "^18.2.15",
                "@types/react-dom": "^18.2.7",
                "@vitejs/plugin-react": "^4.0.3",
                autoprefixer: "^10.4.14",
                postcss: "^8.4.27",
                tailwindcss: "^3.3.3",
                typescript: "^5.0.2",
                vite: "^4.4.5"
            }
        }, null, 2);
    }
};

// Helper: extract string content from both "string" and {code: "string"} formats
const getFileContent = (content: string | { code: string } | undefined): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && 'code' in content) return content.code;
    return '';
};

export default function DownloadBtn({ files }: DownloadBtnProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (Object.keys(files).length === 0) return;

        setIsDownloading(true);

        try {
            const zip = new JSZip();

            // Add root config files
            zip.file('index.html', INDEX_HTML);
            zip.file('vite.config.ts', VITE_CONFIG);
            zip.file('tsconfig.json', TSCONFIG);
            zip.file('tsconfig.node.json', TSCONFIG_NODE);
            zip.file('tailwind.config.js', TAILWIND_CONFIG);
            zip.file('postcss.config.js', POSTCSS_CONFIG);
            zip.file('package.json', getPackageJson(getFileContent(files['/package.json'] || files['package.json']) || undefined));

            // Add src folder files
            const srcFolder = zip.folder('src');
            if (srcFolder) {
                srcFolder.file('main.tsx', MAIN_TSX);
                srcFolder.file('index.css', INDEX_CSS);

                // Add App.tsx from generated files
                const appContent = getFileContent(files['/App.tsx'] || files['App.tsx']);
                if (appContent) {
                    srcFolder.file('App.tsx', appContent);
                }

                // Add any other component files from the generated files
                Object.entries(files).forEach(([path, content]) => {
                    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

                    // Skip files we've already handled
                    if (normalizedPath === 'App.tsx' || normalizedPath === 'package.json') {
                        return;
                    }

                    // Add other files to src
                    if (normalizedPath.endsWith('.tsx') || normalizedPath.endsWith('.ts')) {
                        srcFolder.file(normalizedPath, getFileContent(content));
                    }
                });
            }

            // Add README
            zip.file('README.md', `# DevOpus Project

This project was generated with DevOpus AI Code Generator.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tech Stack
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons
`);

            // Generate the zip file
            const blob = await zip.generateAsync({ type: 'blob' });

            // Trigger download
            saveAs(blob, 'devopus-project.zip');
        } catch (error) {
            console.error('Error creating zip:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading || Object.keys(files).length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
                background: 'var(--lucid-green)',
                color: '#000',
                opacity: Object.keys(files).length === 0 ? 0.5 : 1,
                cursor: Object.keys(files).length === 0 ? 'not-allowed' : 'pointer',
            }}
            title="Download project as ZIP"
        >
            {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            <span>Export as Zip</span>
        </button>
    );
}
