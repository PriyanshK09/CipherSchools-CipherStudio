# CipherStudio IDE - Complete Rebuild Documentation

## Overview
CipherStudio has been completely rebuilt with a production-ready architecture using **Monaco Editor** (the same editor that powers VS Code) instead of Sandpack. This provides a more stable, performant, and feature-rich coding experience.

## Architecture Changes

### 1. **Monaco Editor Integration**
- **Replaced**: Sandpack CodeEditor
- **With**: @monaco-editor/react
- **Benefits**:
  - Industry-standard editor used in VS Code
  - Superior performance and stability
  - Advanced features: IntelliSense, code folding, multi-cursor
  - Full syntax highlighting and language support
  - Customizable themes and fonts

### 2. **Live Preview System**
- **Component**: `Preview.jsx`
- **Technology**: Iframe-based with dynamic HTML generation
- **Features**:
  - Real-time code execution
  - Live console output capture
  - Error boundary with visual feedback
  - Automatic refresh on file changes
  - Sandboxed execution environment

### 3. **Real-time Bundling**
- Client-side code transformation
- Automatic dependency injection
- CSS and JavaScript consolidation
- No external build tools required

## Key Features

### Editor (EditorPane.jsx)
```jsx
- Monaco Editor with VS Code features
- Syntax highlighting for JS, JSX, TS, CSS, HTML, JSON, Markdown
- Auto-save with 300ms debounce
- Font size control (10px - 24px)
- Theme support (light/dark)
- Line numbers and minimap toggle
- Code formatting and autocompletion
```

### Live Preview (Preview.jsx)
```jsx
- Real-time iframe rendering
- Console output capture (log, error, warn)
- Runtime error display
- Manual refresh capability
- Collapsible console panel
- Automatic HTML/CSS/JS bundling
```

### File Management
```jsx
- Create/Delete files and folders
- Rename with duplicate detection
- Tree structure with expand/collapse
- File type detection
- Path normalization
```

### Productivity Features
```jsx
- Command Palette (Ctrl+P)
- Global Search (Ctrl+Shift+F)
- Keyboard shortcuts
- Theme toggle
- Font size controls
- Auto-save to localStorage
- Cloud sync when authenticated
```

## Component Structure

```
IDE
├── ActivityBar (left sidebar icons)
├── FileExplorer (file tree)
├── EditorPane (Monaco editor)
├── Preview (live output + console)
└── StatusBar (bottom info bar)

Overlays
├── CommandPalette
├── GlobalSearch
└── TemplateGallery
```

## How It Works

### File Editing Flow
1. User clicks file in FileExplorer
2. EditorPane loads file content into Monaco
3. User types code
4. Debounced auto-save updates ProjectContext
5. Preview detects tree change and regenerates

### Preview Rendering Flow
1. Traverse file tree to collect all files
2. Extract HTML, CSS, JS files
3. Generate complete HTML document:
   - Inject CSS as `<style>` tags
   - Transform JSX/imports (basic)
   - Inject JS as `<script type="module">`
   - Add console capture hooks
4. Create Blob URL and load in iframe
5. Listen for postMessage from iframe for console output

### Console Capture
```javascript
// Injected into preview iframe
console.log = (...args) => {
  originalLog(...args);
  window.parent.postMessage({
    type: 'console-log',
    args: args.map(String)
  }, '*');
};
```

## Configuration

### Monaco Editor Options
```javascript
{
  fontSize: 13,              // User adjustable
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: "on",
  lineNumbers: "on",
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontLigatures: true,
  cursorBlinking: "smooth",
  smoothScrolling: true
}
```

### Iframe Sandbox Permissions
```javascript
sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save (visual feedback) |
| `Ctrl+P` | Open Command Palette |
| `Ctrl+Shift+F` | Global Search |
| `Ctrl+Shift+N` | New File |
| `Ctrl+Shift+F` | New Folder |
| `Esc` | Close overlays |

## Performance Optimizations

1. **Debounced Updates**: 300ms delay on editor changes
2. **Refs for Stable Values**: Avoid re-subscriptions
3. **Memoized Computations**: Tree traversal cached
4. **Blob URLs**: Fast iframe reloads
5. **Virtualized File Tree**: Efficient rendering

## Limitations & Future Enhancements

### Current Limitations
- Basic JSX transformation (no full Babel)
- No npm package imports in preview
- Simple import resolution
- Single-file module system

### Planned Enhancements
1. **Advanced Bundler**
   - Integrate esbuild-wasm or Sucrase
   - Full JSX/TSX compilation
   - npm package resolution
   - Source maps

2. **Collaborative Features**
   - Real-time multiplayer editing
   - Cursor sharing
   - Live presence

3. **Advanced Editor**
   - Git integration
   - Diff viewer
   - Code snippets
   - Extensions marketplace

4. **Testing & Debug**
   - Built-in test runner
   - Debugger with breakpoints
   - Network inspector

## Troubleshooting

### Preview not updating
- Check browser console for errors
- Verify file tree has valid content
- Manual refresh button available

### Editor lag
- Reduce file size
- Disable minimap (already off by default)
- Check browser performance

### Console not showing output
- Ensure `console.log()` calls in your code
- Check iframe sandbox permissions
- Verify postMessage listener active

## Dependencies

```json
{
  "@monaco-editor/react": "^4.x",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "lucide-react": "^0.424.0",
  "react-router-dom": "^6.26.2"
}
```

## Migration from Sandpack

### Removed
- `@codesandbox/sandpack-react`
- `SandpackProvider`
- `SandpackCodeEditor`
- `SandpackPreview`
- `SandpackConsole`
- `useSandpack` hook

### Added
- `@monaco-editor/react`
- `Editor` component from Monaco
- Custom `Preview` component
- Iframe-based runtime

### Benefits of Migration
✅ More stable and reliable
✅ Better performance
✅ Industry-standard editor
✅ Full control over bundling
✅ Easier to debug
✅ No dependency on external CDN
✅ Works offline

## Conclusion

The new CipherStudio IDE is built on modern, battle-tested technologies that provide a robust foundation for a professional coding environment. The Monaco Editor integration brings VS Code-level editing experience, while the custom preview system gives full control over code execution and debugging.
