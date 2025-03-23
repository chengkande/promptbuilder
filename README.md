# LLM Prompt Builder

A streamlined web application for creating, editing, and managing prompts for Large Language Models (LLMs). This tool allows users to easily craft prompts with multiple attachments and preview the final output in markdown format.

## Features

- **Core Prompt Editor**: Write your main prompt with character count tracking
- **Attachment Management**:
  - Create empty attachments with a single click
  - Paste content from clipboard
  - Drag and drop files (all file types supported up to 1MB)
  - Edit attachment names (double-click to rename)
  - Real-time attachment content editing
- **Project Management**:
  - Save projects to XML format
  - Open previously saved projects
- **Output Preview**:
  - Toggle between text and formatted markdown preview
  - Copy complete output to clipboard with a single click
  - Real-time character count tracking

## How to Use

1. **Write Your Main Prompt**: Enter your primary instructions in the "Prompt Input" section
2. **Add Attachments**: 
   - Click the "+" button to create a new empty attachment
   - Use "Paste" to add clipboard content
   - Drag and drop files directly into the application
3. **Edit Attachments**:
   - Click on any attachment to select and edit its content
   - Double-click on an attachment name to rename it
4. **Preview and Export**:
   - Toggle between text and preview modes in the output section
   - Click "Copy" to copy the formatted output to your clipboard
   - Use "Save" to export your entire project for later use

## Technical Details

Built with:
- Vue.js 3 with TypeScript
- Composition API
- vue3-markdown-it for markdown rendering
- Highlight.js for code syntax highlighting

## Development Setup

### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

### Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
    1) Run `Extensions: Show Built-in Extensions` from VSCode's command palette
    2) Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type-Check, Compile and Minify for Production
npm run build
```

See [Vite Configuration Reference](https://vitejs.dev/config/) for more information on configuring Vite.

## Browser Compatibility

The application works best in modern browsers that support the File API, Clipboard API, and Drag and Drop API.
