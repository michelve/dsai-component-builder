# Design System Component Generation - Universal Prompt

## MISSION

Generate production-ready component specification JSON for the DSAI Component Builder following Bootstrap 5.3 design system standards with WCAG AA/AAA accessibility compliance. Output MUST be deterministic, token-based, and enterprise-grade.

---

## CRITICAL FOUNDATION

### Bootstrap 5.3 Alignment
- ALL components must map to Bootstrap 5.3 utilities, classes, and conventions
- Reference official Bootstrap documentation for each variant
- Use Bootstrap semantic naming (primary, secondary, success, danger, warning, info, light, dark)
- Follow Bootstrap spacing, sizing, and typography scales

### Token System Architecture
**MANDATORY**: Cross-reference token files in `sample/export_samples/`:

1. **`foundation.json`** - Color palette, semantic colors, brand colors
   - Structure: `Foundation/Light/semantic/{token-name}`
   - Structure: `Foundation/colors/brand/{color}/{shade}`
   - Contains: All color tokens with WCAG contrast ratios
   - Use: Text colors, background colors, border colors, state colors

2. **`typography.json`** - Typography tokens
   - Structure: `Typography/Base/{category}/{property}`
   - Contains: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing
   - Use: All text styling properties

3. **`spacing.json`** - Spacing and sizing tokens
   - Structure: `Spacing/{category}/{size}`
   - Contains: Padding, margin, gap tokens
   - Use: Component spacing, layout

4. **`layout.json`** - Layout and structure tokens
   - Contains: Width, height, breakpoint values
   - Use: Component dimensions, responsive behavior

5. **`radius.json`** - Border radius tokens
   - Structure: `Radius/{size}`
   - Use: Rounded corners, shape definition

6. **`shadows.json`** - Shadow and elevation tokens
   - Structure: `Shadow/{level}`
   - Use: Depth, elevation, focus states

### Token Reference Rules
```
✅ CORRECT: {Typography/Base/fontSize/base}
✅ CORRECT: {Foundation/Light/semantic/primary-text-emphasis}
✅ CORRECT: {Spacing/padding/3}

❌ WRONG: 16px
❌ WRONG: #0d6efd
❌ WRONG: $font-size-base
❌ WRONG: var(--bs-primary)
```

### Accessibility Standards (Non-Negotiable)
- **Text Contrast**: Minimum 4.5:1 (WCAG AA), Target 7:1 (WCAG AAA)
- **Line Height**: Minimum 1.5 for body text (WCAG requirement)
- **Interactive Elements**: Minimum 3:1 contrast difference
- **Color Alone**: Never convey meaning with color alone
- **Semantic Colors**: Use `-emphasis` variants for text (e.g., `primary-text-emphasis` not `primary`)

---

## OUTPUT STRUCTURE

### Complete JSON Schema

```json
{
  "componentSet": {
    "name": "Component Category / Component Name",
    "pageName": "Component Category",
    "key": "component-name-###",
    "type": "COMPONENT_SET",
    "description": "Comprehensive description with Bootstrap reference",
    "documentationLink": "https://getbootstrap.com/docs/5.3/..."
  },
  "defaultStyles": {
    "label": "Default component label text",
    "text": "{Foundation/...}",
    "fontName": "{Typography/Base/fontFamily/base}",
    "fontWeight": "{Typography/Base/fontWeight/normal}",
    "fontSize": "{Typography/Base/fontSize/base}",
    "lineHeight": "{Typography/Base/lineHeight/base}",
    "letterSpacing": "{Typography/Base/letterSpacing/normal}",
    "textAlignHorizontal": "LEFT",
    "textAlignVertical": "TOP",
    "textLayout": {
      "textAutoResize": "WIDTH_AND_HEIGHT"
    }
  },
  "variants": [
    {
      "variant": "variant-name",
      "state": "state-name",
      "size": "size-name",
      "styles": {
        "label": "Descriptive label with context",
        "fontSize": "{Typography/...}",
        "fontWeight": "{Typography/...}",
        "lineHeight": "{Typography/...}",
        "text": "{Foundation/...}"
      },
      "description": "Usage description with Bootstrap class (.class-name), actual values, use cases, and accessibility notes",
      "documentationLink": "https://getbootstrap.com/docs/5.3/..."
    }
  ]
}
```

---

## GENERATION WORKFLOW

### STEP 1: Analyze Requirements
1. Identify component type (typography, button, form, etc.)
2. List all Bootstrap 5.3 variants for this component
3. Map variants to semantic purposes (default, primary, success, etc.)
4. Define states (default, hover, focus, active, disabled)
5. Define sizes (sm, base, lg, etc.)

### STEP 2: Cross-Reference Tokens
**BEFORE writing any values**, open and reference:
- `sample/export_samples/foundation.json` for colors
- `sample/export_samples/typography.json` for text properties
- Other token files as needed for the component

**Token Discovery Process**:
```
1. Determine property needed (e.g., "primary text color")
2. Search token files for matching token
3. Verify token exists and has correct $scopes
4. Use exact token path: {Scope/Category/Property}
5. Verify token meets accessibility requirements
```

### STEP 3: Build Component Metadata
```json
{
  "componentSet": {
    "name": "[Category] / [Name]",
    "pageName": "[Category]",
    "key": "[lowercase-name]-###",
    "type": "COMPONENT_SET",
    "description": "[Purpose] with Bootstrap [feature]. Includes [variants]. Features [capabilities]. [Accessibility note].",
    "documentationLink": "https://getbootstrap.com/docs/5.3/[section]"
  }
}
```

### STEP 4: Define Default Styles
- Inherit from most common/neutral variant
- Use base/default tokens
- Set fixed values: `textAlignHorizontal: "LEFT"`, `textAlignVertical: "TOP"`
- Always include `textLayout: { "textAutoResize": "WIDTH_AND_HEIGHT" }`

### STEP 5: Generate Variants Systematically

**For each variant, define**:
1. **variant**: Component variation (body, lead, h1, button, card, etc.)
2. **state**: Semantic or interactive state (default, primary, hover, active, etc.)
3. **size**: Size variation (sm, base, lg, or specific sizes)
4. **styles**: Token references for all visual properties
5. **description**: Format: "[Bootstrap class] - [actual values]. Use for [use cases]. [Accessibility note]."
6. **documentationLink**: Specific Bootstrap 5.3 URL

**Description Template**:
```
"[Component] with [Bootstrap class] ([actual values]) - [Purpose and when to use]. [Accessibility compliance note]."
```

**Example**:
```
"Body text with .text-primary-emphasis (blue-700, shade 60%) - Use for text that needs brand emphasis or primary CTAs. Higher contrast than standard primary for better readability. WCAG AA compliant."
```

### STEP 6: Validate Output

**Pre-Flight Checklist**:
- [ ] Valid JSON (no syntax errors)
- [ ] All required top-level keys present
- [ ] All token references use `{Scope/Category/Property}` format
- [ ] NO hardcoded values (colors, pixels, literals)
- [ ] Every variant has all required keys
- [ ] Every style uses token references
- [ ] Descriptions include Bootstrap class names
- [ ] Descriptions include actual values and use cases
- [ ] Documentation links are valid Bootstrap 5.3 URLs
- [ ] Text colors use `-emphasis` variants where appropriate
- [ ] Line heights meet WCAG AA (1.5+ for body text)
- [ ] Contrast ratios verified in token descriptions

---

## COMPONENT-SPECIFIC GUIDELINES

### Typography Components

**Variants to Include**:
- Body text: default, primary, secondary, tertiary, semantic colors (success, danger, warning, info), emphasis colors (light, dark)
- Headings: h1-h6 with color variants
- Display: display-1 through display-6
- Specialty: lead, small, code, links (with hover), emphasis (bold, semibold, light)

**Required Properties**:
- fontSize, fontWeight, lineHeight, letterSpacing, text (color)
- Use `{Typography/Base/...}` tokens
- Text colors from `{Foundation/Light/semantic/...}`

**Accessibility**:
- Body text: lineHeight 1.5 minimum
- Headings: lineHeight 1.2-1.25 acceptable
- Always use emphasis colors (-text-emphasis) for semantic colors

### Button Components

**Variants to Include**:
- Styles: solid, outline, ghost, link
- States: default, hover, focus, active, disabled
- Sizes: sm, base, lg
- Semantic: primary, secondary, success, danger, warning, info, light, dark

**Required Properties**:
- background, border, text, fontSize, fontWeight, padding, borderRadius
- Focus states must have focus ring (shadow token)
- Disabled states must have reduced opacity

**Accessibility**:
- Minimum 44x44px touch target
- Focus indicators clearly visible
- Disabled states visually distinct

### Form Components

**Variants to Include**:
- Types: text, select, textarea, checkbox, radio
- States: default, focus, error, success, disabled
- Sizes: sm, base, lg

**Required Properties**:
- border, background, text, padding, borderRadius
- Error states need danger color
- Focus states need focus ring

**Accessibility**:
- Error states must not rely on color alone
- Labels always associated
- Focus indicators required

---

## TOKEN DISCOVERY GUIDE

### Finding Color Tokens

**Semantic Text Colors** (Foundation/Light/semantic/):
- `body-color` - Default text (gray-900)
- `emphasis-color` - Maximum emphasis (gray-900)
- `{color}-text-emphasis` - Semantic colors for text (700 shade)
  - primary-text-emphasis, success-text-emphasis, danger-text-emphasis, etc.
- `secondary-color` - Muted text (gray-600)
- `tertiary-color` - Light text (gray-500)
- `link-color` - Link default (blue-600)
- `link-hover-color` - Link hover (blue-700)

**Background Colors** (Foundation/Light/semantic/):
- `body-bg` - Default background
- `{color}-bg-subtle` - Subtle backgrounds for alerts, badges
- `{color}-border-subtle` - Borders for components

**Brand Colors** (Foundation/colors/brand/):
- `{color}/{shade}` - Direct color access (100-900)
- Use 100-300 for backgrounds
- Use 500 for interactive elements
- Use 700-900 for text

### Finding Typography Tokens

**Font Sizes** (Typography/Base/fontSize/):
- `base` - 16px default
- `sm` - 14px small text
- `lg` - 20px large text

**Font Sizes - Specific** (Typography/Base/):
- `headings/h1/fontSize` through `headings/h6/fontSize`
- `display/display1/fontSize` through `display/display6/fontSize`
- `lead/fontSize` - Lead paragraph
- `small/fontSize` - Small text

**Font Weights** (Typography/Base/fontWeight/):
- `lighter` (100), `light` (300), `normal` (400), `medium` (500)
- `semibold` (600), `bold` (700), `bolder` (900)

**Line Heights** (Typography/Base/lineHeight/):
- `base` - 1.5 (body text)
- `tight` - 1.25 (headings)
- `relaxed` - 1.75 (enhanced readability)
- `sm`, `lg` - Specific sizes
- `display-sm`, `display-md`, `display-lg` - Display text

**Font Families** (Typography/Base/fontFamily/):
- `base` - Primary font (Inter)
- `monospace` - Code font (Roboto Mono)

### Finding Spacing Tokens

**Padding/Margin** (Spacing/):
- Use Bootstrap scale: 0, 1, 2, 3, 4, 5 (0, 0.25rem, 0.5rem, 1rem, 1.5rem, 3rem)
- Format: `{Spacing/padding/3}` or `{Spacing/margin/2}`

---

## ERROR PREVENTION

### Common Mistakes

❌ **Using hardcoded colors**
```json
"text": "#0d6efd"  // WRONG
"text": "{Foundation/colors/brand/blue/600}"  // CORRECT
```

❌ **Using non-emphasis colors for text**
```json
"text": "{Foundation/Light/semantic/primary}"  // WRONG - insufficient contrast
"text": "{Foundation/Light/semantic/primary-text-emphasis}"  // CORRECT
```

❌ **Using pixel values instead of tokens**
```json
"fontSize": "16px"  // WRONG
"fontSize": "{Typography/Base/fontSize/base}"  // CORRECT
```

❌ **Wrong token format**
```json
"fontWeight": "$font-weight-bold"  // WRONG - SCSS variable
"fontWeight": "var(--bs-font-weight-bold)"  // WRONG - CSS variable
"fontWeight": "{Typography/Base/fontWeight/bold}"  // CORRECT
```

❌ **Missing token cross-reference**
```
Writing tokens without checking if they exist in token files
```
**Solution**: Always verify token exists in `sample/export_samples/` before using

❌ **Incomplete descriptions**
```json
"description": "Primary button"  // WRONG - too vague
"description": "Primary button with .btn-primary (blue-600 background) - Use for main call-to-action. WCAG AA compliant."  // CORRECT
```

---

## EXECUTION PROTOCOL

### Input Requirements
You will receive:
1. **Component Type**: What component to generate
2. **Variant Requirements**: Which variants to include
3. **Token Context**: Reference to token files (always in `sample/export_samples/`)

### Processing Steps
1. **Acknowledge** component type and requirements
2. **Cross-reference** token files for available tokens
3. **Map** Bootstrap 5.3 classes to variants
4. **Generate** JSON following exact structure
5. **Validate** against checklist
6. **Output** ONLY valid JSON (no explanatory text)

### Output Format
```json
{
  "componentSet": { ... },
  "defaultStyles": { ... },
  "variants": [ ... ]
}
```

**No markdown, no code fences, no explanations - ONLY JSON**

---

## QUALITY STANDARDS

### Determinism
Running this prompt twice with same inputs MUST produce IDENTICAL outputs.

### Consistency
- Token format never varies
- Structure never varies
- Naming conventions never vary
- Description format never vary

### Completeness
- Every required field present
- Every variant documented
- Every token verified
- Every accessibility requirement met

### Enterprise-Grade
- Production-ready output
- No placeholders or TODOs
- No assumptions or guesses
- Complete documentation references

---

## FINAL VALIDATION

Before outputting, verify:

```
✓ JSON is valid and parseable
✓ All tokens verified in sample/export_samples/
✓ All tokens use {Scope/Category/Property} format
✓ No hardcoded values anywhere
✓ All Bootstrap classes referenced in descriptions
✓ All documentation links are valid
✓ Accessibility requirements documented
✓ Contrast ratios appropriate for use case
✓ Line heights meet WCAG standards
✓ Output is deterministic and reproducible
```

---

## EXECUTION DIRECTIVE

GENERATE the requested component specification following ALL guidelines above. Output MUST be production-ready, token-based, Bootstrap 5.3 aligned, and WCAG AA/AAA compliant. Cross-reference ALL tokens with `sample/export_samples/` files. Ensure deterministic results.

**OUTPUT ONLY VALID JSON. NO ADDITIONAL TEXT.**

