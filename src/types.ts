/**
 * TypeScript interfaces for JSON to Component Builder
 */

/**
 * New restructured component configuration
 */
export interface ComponentConfig {
  componentSet: {
    name: string;
    key: string;
    type: string;
  };
  defaultStyles: {
    label: string;
    fills?: string;
    fillsOpacity?: string; // Paint-level fill opacity (for individual layers)
    strokes?: string;
    strokesOpacity?: string; // Paint-level stroke opacity (for individual layers)
    strokeWeight?: string;
    text?: string;
    textOpacity?: string; // Paint-level text opacity (for individual layers)
    radius?: string;
    padding?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
    gap?: string;
    opacity?: string; // NEW: Node-level opacity (entire component)
  };
  variants: VariantConfig[];
}

/**
 * Variant configuration with optional style overrides
 */
export interface VariantConfig {
  variant: string;
  state: string;
  size: string;
  styles?: {
    fills?: string;
    fillsOpacity?: string; // Paint-level fill opacity (for individual layers)
    strokes?: string;
    strokesOpacity?: string; // Paint-level stroke opacity (for individual layers)
    strokeWeight?: string;
    text?: string;
    textOpacity?: string; // Paint-level text opacity (for individual layers)
    radius?: string;
    padding?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
    gap?: string;
    opacity?: string; // NEW: Node-level opacity (entire component)
  };
}

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
