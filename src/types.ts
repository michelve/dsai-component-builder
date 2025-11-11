/**
 * TypeScript interfaces for JSON to Component Builder
 */

/**
 * Component Set metadata
 */
export interface ComponentSet {
  name: string;
  key: string;
  type: string;
  description?: string; // Plain-text annotation for the component set
  documentationLink?: string; // Single documentation URL (will be converted to documentationLinks array)
}

/**
 * Padding configuration for all sides
 */
export interface Padding {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

/**
 * Font name configuration (family + style)
 */
export interface FontName {
  family: string;
  style: string; // e.g., "Regular", "Medium", "Semi Bold", "Bold"
}

/**
 * Text layout configuration
 * Controls text node dimensions and auto-resize behavior
 */
export interface TextLayout {
  textAutoResize?: "WIDTH_AND_HEIGHT" | "HEIGHT" | "WIDTH" | "NONE" | "TRUNCATE"; // Figma's textAutoResize
  width?: number; // Required when textAutoResize is "NONE" (must be number, not string)
  height?: number; // Required when textAutoResize is "NONE" (must be number, not string)
}

/**
 * Typography properties for text styling
 * All dimension properties support token references (e.g., "{Typography/Base/fontSize/base}")
 */
export interface Typography {
  fontName?: FontName | string; // Object format OR token reference string (e.g., "{Typography/Base/fontFamily/base}")
  fontWeight?: string; // Bindable token reference (FLOAT variable 100-900)
  fontSize?: string; // Bindable token reference (px)
  lineHeight?: string; // Bindable token reference (unitless multiplier or AUTO)
  letterSpacing?: string; // Bindable token reference (% or px)
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  paragraphSpacing?: string; // Bindable token reference (px)
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" | "SMALL_CAPS";
  textLayout?: TextLayout; // Nested text layout configuration
  // Deprecated: use textLayout instead
  textAutoResize?: "WIDTH_AND_HEIGHT" | "HEIGHT" | "WIDTH" | "NONE" | "TRUNCATE";
}

/**
 * Complete style configuration for component appearance
 * All color/dimension properties support token references
 */
export interface Style extends Typography {
  label?: string; // Text content for the component
  fills?: string; // Background color token reference
  fillsOpacity?: string; // Paint-level fill opacity (for individual layers)
  strokes?: string; // Border color token reference
  strokesOpacity?: string; // Paint-level stroke opacity
  strokeWeight?: string; // Border width token reference
  text?: string; // Text color token reference
  textOpacity?: string; // Paint-level text opacity
  radius?: string; // Corner radius token reference
  padding?: Padding; // Padding on all sides
  gap?: string; // Gap between elements (auto-layout)
  opacity?: string; // Node-level opacity (entire component, 0-1)
}

/**
 * Variant configuration with property values and optional style overrides
 */
export interface Variant {
  variant: string; // e.g., "primary", "secondary"
  state: string; // e.g., "default", "hover", "active", "disabled"
  size: string; // e.g., "small", "medium", "large"
  styles?: Style; // Optional style overrides for this variant
  description?: string; // Plain-text annotation for this specific variant
}

/**
 * Main component configuration structure
 */
export interface ComponentConfig {
  componentSet: ComponentSet;
  defaultStyles: Style;
  variants: Variant[];
}

/**
 * Legacy type alias for backward compatibility
 */
export type VariantConfig = Variant;

/**
 * Legacy component parameters (keeping for backward compatibility)
 */
export interface ComponentParams {
  // Property settings
  'property.label': string;
  'property.iconEnd': string;
  'property.iconEnd.property.size': string;
  'property.hasIconEnd': string;
  'property.hasIconStart': string;
  'property.iconStart': string;
  'property.iconStart.property.size': string;
  'property.variant': string;
  'property.state': string;
  'property.size': string;

  // Node metadata
  'node.name': string;
  'node.type': string;
  'node.key': string;
  'node.children': string;

  // Component metadata
  'component.key': string;
  'component.type': string;
  'component.name': string;

  // Variables - fills
  'variables.fills': string;
  'variables.fills.w': string;
  'variables.fills.0.w': string;
  'variables.fills.0': string;

  // Variables - strokes
  'variables.strokes': string;
  'variables.strokes.w': string;
  'variables.strokes.0.w': string;
  'variables.strokes.0': string;

  // Variables - text
  'variables.text': string;
  'variables.text.w': string;

  // Variables - radius
  'variables.radius': string;
  'variables.radius.w': string;

  // Variables - spacing
  'variables.spacing.paddingTop': string;
  'variables.spacing.paddingTop.w': string;
  'variables.spacing.paddingBottom': string;
  'variables.spacing.paddingBottom.w': string;
  'variables.spacing.paddingLeft': string;
  'variables.spacing.paddingLeft.w': string;
  'variables.spacing.paddingRight': string;
  'variables.spacing.paddingRight.w': string;
  'variables.spacing.gap': string;
  'variables.spacing.gap.w': string;
}

/**
 * Message types for plugin-UI communication
 */
export interface PluginMessage {
  type: 'upload-json' | 'create-component';
  data: string | ComponentConfig;
}

/**
 * Token reference (e.g., "{Foundation/colors/brand/blue/600}")
 */
export type TokenReference = string;

/**
 * Resolved color value
 */
export interface ResolvedColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Variable mapping result
 */
export interface VariableMapping {
  found: boolean;
  variableId?: string;
  fallbackValue?: ResolvedColor | number;
}
