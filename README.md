# JSON to Component Builder - Figma Plugin

A Figma plugin that automatically creates components from JSON specifications with design tokens. Upload a JSON file containing component properties and design tokens, and the plugin will generate fully-styled Figma components with variable bindings.

## 🎯 Features

- **JSON-based component generation**: Define components in JSON format
- **Design token support**: Maps token references to Figma variables
- **Automatic variant creation**: Generates component variants based on states, sizes, and types
- **Drag-and-drop interface**: Easy file upload with visual feedback
- **Token resolution**: Supports Figma variables and fallback values
- **Auto-layout support**: Components use Figma's auto-layout features

## 📋 Requirements

- Figma Desktop App (latest version)
- Node.js (v16 or higher)
- npm or yarn

## 🚀 Installation

### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd dsai-json-to-component
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Plugin

```bash
npm run build
```

Or watch for changes during development:

```bash
npm run watch
```

### 4. Load Plugin in Figma

1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `manifest.json` file from this project
4. The plugin will appear in **Plugins** → **Development** → **JSON to Component Builder**

## 📖 Usage

### 1. Prepare Your JSON File

Create a JSON file following this structure:

```json
{
  "params": {
    "property.label": "button",
    "property.variant": "primary",
    "property.state": "default",
    "property.size": "medium",
    "node.name": "button-primary",
    "node.type": "component-set",
    "node.key": "primary-button-001",
    "node.children": "12",
    "component.key": "primary-button-001",
    "component.type": "component-set",
    "component.name": "button-primary",
    "variables.fills": "{Foundation/colors/brand/blue/600}",
    "variables.fills.w": "var(--bs-blue-600)",
    "variables.strokes": "{Foundation/colors/brand/blue/700}",
    "variables.strokes.w": "var(--bs-blue-700)",
    "variables.text": "{Foundation/colors/neutral/white}",
    "variables.text.w": "var(--bs-white)",
    "variables.radius": "{Radius/radius/default}",
    "variables.radius.w": "var(--bs-border-radius)",
    "variables.spacing.paddingTop": "{Spacing/spacing/2}",
    "variables.spacing.paddingTop.w": "var(--bs-spacer-2)",
    "variables.spacing.paddingBottom": "{Spacing/spacing/2}",
    "variables.spacing.paddingBottom.w": "var(--bs-spacer-2)",
    "variables.spacing.paddingLeft": "{Spacing/spacing/3}",
    "variables.spacing.paddingLeft.w": "var(--bs-spacer-3)",
    "variables.spacing.paddingRight": "{Spacing/spacing/3}",
    "variables.spacing.paddingRight.w": "var(--bs-spacer-3)",
    "variables.spacing.gap": "{Spacing/spacing/2}",
    "variables.spacing.gap.w": "var(--bs-spacer-2)"
  },
  "paramsRaw": {
    // Same structure as params, but with original casing
  },
  "template": {}
}
```

### 2. Run the Plugin

1. Open a Figma file (or create a new one)
2. Go to **Plugins** → **Development** → **JSON to Component Builder**
3. Drag and drop your JSON file into the upload area (or click to browse)
4. Click **Create Components**
5. The plugin will generate your component with all variants!

### 3. What Gets Created

The plugin creates:

- **Component Set**: Main container for all variants
- **Component Variants**: Individual components for each state/size combination
- **Auto-layout**: Components use auto-layout with proper spacing
- **Styling**: Fills, strokes, corner radius applied from tokens
- **Text layers**: Button labels with proper styling

## 🔧 JSON Structure Reference

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `params` | Component parameters (lowercase) | `{ "node.name": "button-primary" }` |
| `paramsRaw` | Raw parameters (original casing) | `{ "node.name": "Button Primary" }` |
| `template` | Template configuration (optional) | `{}` |

### Property Fields

| Field | Description | Values |
|-------|-------------|--------|
| `property.label` | Button text | `"button"`, `"submit"` |
| `property.variant` | Component variant | `"primary"`, `"secondary"` |
| `property.state` | Component state | `"default"`, `"hover"`, `"active"`, `"disabled"` |
| `property.size` | Component size | `"small"`, `"medium"`, `"large"` |

### Node Fields

| Field | Description |
|-------|-------------|
| `node.name` | Component name in Figma |
| `node.type` | Type (usually `"component-set"`) |
| `node.key` | Unique identifier |
| `node.children` | Number of variants to create |

### Variable Fields (Design Tokens)

| Field | Description | Format |
|-------|-------------|--------|
| `variables.fills` | Background color token | `"{Foundation/colors/brand/blue/600}"` |
| `variables.fills.w` | CSS variable (web) | `"var(--bs-blue-600)"` |
| `variables.strokes` | Border color token | `"{Foundation/colors/brand/blue/700}"` |
| `variables.text` | Text color token | `"{Foundation/colors/neutral/white}"` |
| `variables.radius` | Corner radius token | `"{Radius/radius/default}"` |
| `variables.spacing.paddingTop` | Top padding token | `"{Spacing/spacing/2}"` |
| `variables.spacing.paddingBottom` | Bottom padding | `"{Spacing/spacing/2}"` |
| `variables.spacing.paddingLeft` | Left padding | `"{Spacing/spacing/3}"` |
| `variables.spacing.paddingRight` | Right padding | `"{Spacing/spacing/3}"` |
| `variables.spacing.gap` | Item spacing (gap) | `"{Spacing/spacing/2}"` |

## 🎨 Token Resolution

The plugin attempts to resolve tokens in this order:

1. **Figma Variables**: Looks for matching local variables by name
2. **Fallback Values**: Uses sensible defaults if variables don't exist

### Token Format

Tokens use curly brace syntax: `{Collection/Category/Name}`

Example:
- `{Foundation/colors/brand/blue/600}` → Looks for Figma variable
- If not found → Uses fallback color `#3B82F6`

## 📂 Project Structure

```
dsai-json-to-component/
├── src/
│   ├── code.ts              # Main plugin logic
│   ├── componentBuilder.ts  # Component creation engine
│   ├── tokenResolver.ts     # Token-to-variable mapping
│   └── types.ts            # TypeScript interfaces
├── manifest.json           # Plugin manifest
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── ui.html               # Plugin UI
├── sampel.json           # Example JSON file
└── README.md             # This file
```

## 🛠️ Development

### Watch Mode

Run TypeScript compiler in watch mode:

```bash
npm run watch
```

Or use VS Code:
1. Press `Ctrl+Shift+B` (Windows) or `Cmd+Shift+B` (Mac)
2. Select `tsc: watch - tsconfig.json`

### Hot Reload

Enable hot reloading in Figma:
1. Go to **Plugins** → **Development**
2. Toggle **Hot reload plugin** ON

Now changes will automatically reload the plugin!

## 🐛 Troubleshooting

### "Cannot find module" errors
Run `npm install` to install dependencies.

### TypeScript compilation errors
Make sure you're running `npm run build` or `npm run watch`.

### Plugin doesn't load in Figma
1. Make sure you're using **Figma Desktop App** (not browser)
2. Check that `manifest.json` and `code.js` exist
3. Try re-importing the plugin

### Variables not found
1. Ensure variables exist in your Figma file
2. Check variable names match token references
3. Plugin will use fallback values if variables aren't found

### Components look incorrect
1. Verify your JSON structure matches the expected format
2. Check token references are properly formatted
3. Ensure `node.children` count matches expected variants

## 📝 Example Files

See `sampel.json` for a complete working example of the JSON structure.

## 🚧 Known Limitations

- Corner radius doesn't support variable binding (Figma API limitation)
- Icons must be manually added after component creation
- Limited to predefined variant combinations
- Requires Figma Desktop App for development

## 🔮 Future Enhancements

- [ ] Support for icon components
- [ ] Custom variant property definitions
- [ ] Batch component creation from multiple JSON files
- [ ] Export existing components to JSON format
- [ ] Enhanced token resolution with token studio support

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on the repository.

---

**Made with ❤️ for Design Systems**
