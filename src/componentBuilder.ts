import type { ComponentConfig, Variant, Style } from './types';
import {
  applyFillToken,
  applyStrokeToken,
  applyStrokeWeightToken,
  applyRadiusToken,
  applyPaddingTokens,
  applyGapToken,
  applyTextFillToken,
  applyNodeOpacity,
  applyFontNameToken,
  applyFontSizeToken,
  applyFontWeightToken,
  applyLineHeightToken,
  applyLetterSpacingToken,
  applyParagraphSpacingToken,
  applyTextAlignment,
  applyTextDecoration,
  applyTextCase,
  applyTextAutoResize,
} from './tokenResolver';

/**
 * Component Builder Module
 * 
 * This module handles the creation of Figma components from JSON configuration.
 * It supports design token binding, variant generation, and complete style application.
 * 
 * @module componentBuilder
 */

/**
 * Result object returned by component creation operations
 */
interface BuildResult {
  /** Whether the operation completed successfully */
  success: boolean;
  /** Number of component variants created (if successful) */
  componentsCreated?: number;
  /** Error message (if failed) */
  error?: string;
  /** Success or status message */
  message?: string;
}

/**
 * Main entry point for creating Figma components from JSON configuration
 * 
 * This function orchestrates the entire component creation process:
 * 1. Validates the configuration structure
 * 2. Creates a new Figma page for the component
 * 3. Generates all component variants
 * 4. Combines variants into a component set
 * 5. Positions and selects the result
 * 
 * @param config - The component configuration object containing componentSet metadata, defaultStyles, and variants
 * @returns Promise resolving to BuildResult with success status and details
 * 
 * @example
 * ```typescript
 * const result = await loadJSONAndCreateComponents({
 *   componentSet: { name: "Button", key: "btn-001", type: "COMPONENT_SET" },
 *   defaultStyles: { fills: "{colors/blue}", radius: "8" },
 *   variants: [
 *     { variant: "primary", state: "default", size: "medium" }
 *   ]
 * });
 * 
 * if (result.success) {
 *   console.log(`Created ${result.componentsCreated} variants`);
 * }
 * ```
 * 
 * @throws {Error} If config is invalid or component creation fails
 */
export async function loadJSONAndCreateComponents(
  config: ComponentConfig
): Promise<BuildResult> {
  try {
    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: config must be an object');
    }

    const { componentSet: componentSetInfo, defaultStyles, variants } = config;

    // Validate required fields
    if (!componentSetInfo) {
      throw new Error('Missing required field: componentSet');
    }
    if (!defaultStyles) {
      throw new Error('Missing required field: defaultStyles');
    }
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      throw new Error('Missing or empty variants array');
    }

    const componentName = componentSetInfo.name || 'Button Component';

    console.log(`Creating component set "${componentName}" with ${variants.length} variants...`);

    // Create a new page for this component
    let newPage: PageNode;
    try {
      newPage = figma.createPage();
      newPage.name = componentName;
      await figma.setCurrentPageAsync(newPage);
    } catch (error) {
      throw new Error(`Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create the component set with all variants
    let componentSet: ComponentSetNode;
    try {
      componentSet = await createComponentSet(config);
    } catch (error) {
      throw new Error(`Failed to create component set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Create a container frame
    let containerFrame: FrameNode;
    try {
      containerFrame = createContainerFrame(componentName);
      containerFrame.appendChild(componentSet);
      newPage.appendChild(containerFrame);
    } catch (error) {
      throw new Error(`Failed to create container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Select and focus on the container
    try {
      figma.currentPage.selection = [containerFrame];
      figma.viewport.scrollAndZoomIntoView([containerFrame]);
    } catch (error) {
      console.warn('Failed to select/focus container:', error);
      // Non-critical, continue
    }

    return {
      success: true,
      componentsCreated: variants.length,
      message: `Created component set "${componentName}" with ${variants.length} variants`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating components:', error);
    figma.notify(`Error: ${errorMessage}`, { error: true });
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Creates a container frame to hold the component set
 * 
 * The container is set up with auto-layout for easy positioning and provides
 * visual organization on the Figma canvas.
 * 
 * @param name - Display name for the container frame
 * @returns A configured FrameNode with auto-layout and padding
 */
function createContainerFrame(name: string): FrameNode {
  const containerFrame = figma.createFrame();
  containerFrame.name = name;
  containerFrame.layoutMode = 'HORIZONTAL';
  containerFrame.primaryAxisSizingMode = 'AUTO';
  containerFrame.counterAxisSizingMode = 'AUTO';
  containerFrame.itemSpacing = 20;
  containerFrame.paddingLeft = 20;
  containerFrame.paddingRight = 20;
  containerFrame.paddingTop = 20;
  containerFrame.paddingBottom = 20;
  containerFrame.x = 100;
  containerFrame.y = 100;
  containerFrame.fills = []; // Transparent background
  
  return containerFrame;
}

/**
 * Creates a component set by generating and combining all variants
 * 
 * This function iterates through all variant configurations, creates individual
 * components for each, and combines them into a Figma component set. Each variant
 * is positioned vertically with consistent spacing.
 * 
 * @param config - Complete component configuration including componentSet metadata, defaultStyles, and variants array
 * @returns Promise resolving to a ComponentSetNode containing all variants
 * 
 * @throws {Error} If any variant creation fails or if components cannot be combined
 * 
 * @example
 * ```typescript
 * const componentSet = await createComponentSet({
 *   componentSet: { name: "Button", key: "btn", type: "COMPONENT_SET" },
 *   defaultStyles: { fills: "{colors/blue}" },
 *   variants: [
 *     { variant: "primary", state: "default", size: "medium" },
 *     { variant: "primary", state: "hover", size: "medium" }
 *   ]
 * });
 * ```
 */
async function createComponentSet(config: ComponentConfig): Promise<ComponentSetNode> {
  try {
    const { componentSet: componentSetInfo, defaultStyles, variants } = config;
    const componentNodes: ComponentNode[] = [];
    let yPosition = 0;
    const spacing = 24;

    // Create each variant as a component
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      try {
        console.log(`Creating variant ${i + 1}/${variants.length}:`, variant.variant, variant.state, variant.size);
        const component = await createComponentVariant(variant, defaultStyles);
        
        // Position components vertically with spacing
        component.x = 0;
        component.y = yPosition;
        yPosition += component.height + spacing;
        
        componentNodes.push(component);
        figma.currentPage.appendChild(component);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create variant ${i + 1}:`, errorMsg);
        throw new Error(`Failed to create variant ${i + 1} (${variant.variant}/${variant.state}/${variant.size}): ${errorMsg}`);
      }
    }

    if (componentNodes.length === 0) {
      throw new Error('No components were created successfully');
    }

    // Combine all components into a component set
    let componentSet: ComponentSetNode;
    try {
      componentSet = figma.combineAsVariants(componentNodes, figma.currentPage);
      componentSet.name = componentSetInfo.name;
      
      // Set description if provided
      if (componentSetInfo.description) {
        componentSet.description = componentSetInfo.description;
      }
      
      // Set documentation links if provided
      if (componentSetInfo.documentationLink) {
        componentSet.documentationLinks = [{
          uri: componentSetInfo.documentationLink
        }];
      }
    } catch (error) {
      throw new Error(`Failed to combine components into variant set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return componentSet;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in createComponentSet';
    console.error('Error in createComponentSet:', error);
    throw new Error(errorMessage);
  }
}

/**
 * Creates a single component variant with merged styles
 * 
 * This function orchestrates the creation of one variant by:
 * 1. Merging default styles with variant-specific overrides
 * 2. Creating the base component structure
 * 3. Applying all visual styles (fills, strokes, spacing, etc.)
 * 4. Creating and styling the text content
 * 5. Setting up auto-resize behavior
 * 
 * @param variantConfig - Variant-specific configuration (variant, state, size, and style overrides)
 * @param defaultStyles - Default styles to be applied to all variants
 * @returns Promise resolving to a fully styled ComponentNode
 * 
 * @throws {Error} If variant config is invalid or style application fails
 * 
 * @example
 * ```typescript
 * const component = await createComponentVariant(
 *   { 
 *     variant: "primary", 
 *     state: "hover", 
 *     size: "medium",
 *     styles: { fills: "{colors/blue-dark}" }
 *   },
 *   { 
 *     fills: "{colors/blue}", 
 *     radius: "8" 
 *   }
 * );
 * ```
 */
async function createComponentVariant(
  variantConfig: Variant,
  defaultStyles: Style
): Promise<ComponentNode> {
  try {
    // Validate variant config
    if (!variantConfig.variant || !variantConfig.state || !variantConfig.size) {
      throw new Error('Variant must have variant, state, and size properties');
    }

    // Merge default styles with variant-specific overrides
    const styles = mergeStyles(variantConfig, defaultStyles);

    // Create the component with basic setup
    const component = createBaseComponent(variantConfig);
    
    // Apply all styles to the component
    try {
      await applyComponentStyles(component, styles);
    } catch (error) {
      throw new Error(`Failed to apply component styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Create and style the text node
    try {
      const textNode = await createStyledTextNode(styles, variantConfig.size);
      component.appendChild(textNode);
    } catch (error) {
      throw new Error(`Failed to create text node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Set resize constraints
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'AUTO';

    return component;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in createComponentVariant';
    console.error('Error in createComponentVariant:', error);
    throw new Error(errorMessage);
  }
}

/**
 * Merges variant-specific styles with default styles
 * 
 * Creates a complete Style object by combining default styles with variant overrides.
 * Variant styles take precedence over defaults. For padding, properties are spread
 * to allow partial overrides (e.g., only override top padding).
 * 
 * @param variantConfig - Variant configuration with optional style overrides
 * @param defaultStyles - Default styles to apply to all variants
 * @returns Complete Style object with merged properties
 * 
 * @example
 * ```typescript
 * const merged = mergeStyles(
 *   { 
 *     variant: "primary", 
 *     state: "hover", 
 *     size: "medium",
 *     styles: { fills: "{colors/blue-dark}", padding: { top: "12" } }
 *   },
 *   { 
 *     fills: "{colors/blue}", 
 *     padding: { top: "8", bottom: "8", left: "16", right: "16" } 
 *   }
 * );
 * // Result: fills is blue-dark, padding top is 12, other padding values from default
 * ```
 */
function mergeStyles(variantConfig: Variant, defaultStyles: Style): Style {
  return {
    label: defaultStyles.label,
    fills: variantConfig.styles?.fills || defaultStyles.fills,
    fillsOpacity: variantConfig.styles?.fillsOpacity || defaultStyles.fillsOpacity,
    strokes: variantConfig.styles?.strokes || defaultStyles.strokes,
    strokesOpacity: variantConfig.styles?.strokesOpacity || defaultStyles.strokesOpacity,
    strokeWeight: variantConfig.styles?.strokeWeight || defaultStyles.strokeWeight,
    text: variantConfig.styles?.text || defaultStyles.text,
    textOpacity: variantConfig.styles?.textOpacity || defaultStyles.textOpacity,
    radius: variantConfig.styles?.radius || defaultStyles.radius,
    padding: { ...defaultStyles.padding, ...variantConfig.styles?.padding },
    gap: variantConfig.styles?.gap || defaultStyles.gap,
    opacity: variantConfig.styles?.opacity || defaultStyles.opacity,
    // Typography styles
    fontName: variantConfig.styles?.fontName || defaultStyles.fontName,
    fontWeight: variantConfig.styles?.fontWeight || defaultStyles.fontWeight,
    fontSize: variantConfig.styles?.fontSize || defaultStyles.fontSize,
    lineHeight: variantConfig.styles?.lineHeight || defaultStyles.lineHeight,
    letterSpacing: variantConfig.styles?.letterSpacing || defaultStyles.letterSpacing,
    textAlignHorizontal: variantConfig.styles?.textAlignHorizontal || defaultStyles.textAlignHorizontal,
    textAlignVertical: variantConfig.styles?.textAlignVertical || defaultStyles.textAlignVertical,
    paragraphSpacing: variantConfig.styles?.paragraphSpacing || defaultStyles.paragraphSpacing,
    textDecoration: variantConfig.styles?.textDecoration || defaultStyles.textDecoration,
    textCase: variantConfig.styles?.textCase || defaultStyles.textCase
  };
}

/**
 * Creates the base component structure with layout configuration
 * 
 * Initializes a ComponentNode with auto-layout enabled and sets the component
 * name following Figma's variant naming convention (Variant=X, State=Y, Size=Z).
 * 
 * @param variantConfig - Variant configuration with property values for naming
 * @returns ComponentNode configured with auto-layout and initial dimensions
 * 
 * @example
 * ```typescript
 * const component = createBaseComponent({
 *   variant: "primary",
 *   state: "hover",
 *   size: "medium"
 * });
 * // Creates component named: "Variant=primary, State=hover, Size=medium"
 * ```
 */
function createBaseComponent(variantConfig: Variant): ComponentNode {
  const component = figma.createComponent();
  component.name = `Variant=${variantConfig.variant}, State=${variantConfig.state}, Size=${variantConfig.size}`;
  
  // Set description if provided
  if (variantConfig.description) {
    component.description = variantConfig.description;
  }
  
  // Set up auto-layout for flexible sizing
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.resize(120, 40); // Initial size (will auto-resize based on content)

  return component;
}

/**
 * Apply all visual styles to component (fills, strokes, spacing, etc.)
 */
/**
 * Applies all visual styles to a component
 * 
 * This function handles the application of all visual properties including:
 * - Layout: padding and gap (spacing between items)
 * - Colors: fills (background) and strokes (borders) with opacity support
 * - Dimensions: stroke weight and corner radius
 * 
 * Each property attempts variable binding first, falling back to literal values if needed.
 * Individual try-catch blocks ensure one failing property doesn't block others.
 * 
 * @param component - The ComponentNode to style
 * @param styles - Complete Style object with all visual properties
 * @returns Promise that resolves when all styles are applied
 * 
 * @throws {Error} If critical styling operation fails
 */
async function applyComponentStyles(component: ComponentNode, styles: Style): Promise<void> {
  try {
    // === LAYOUT PROPERTIES ===
    
    // Padding: Internal spacing from edges to content
    if (styles.padding) {
      try {
        await applyPaddingTokens(component, {
          top: styles.padding.top || '{Spacing/Base/spacing/2}',
          bottom: styles.padding.bottom || '{Spacing/Base/spacing/2}',
          left: styles.padding.left || '{Spacing/Base/spacing/3}',
          right: styles.padding.right || '{Spacing/Base/spacing/3}'
        });
      } catch (error) {
        console.warn('Failed to apply padding:', error);
      }
    }

    // Gap: Spacing between child elements in auto-layout
    if (styles.gap) {
      try {
        await applyGapToken(component, styles.gap);
      } catch (error) {
        console.warn('Failed to apply gap:', error);
      }
    }

    // === COLOR PROPERTIES ===
    
    // Fills: Background color with variable binding support
    if (styles.fills) {
      try {
        await applyFillToken(component, styles.fills, 0);
      } catch (error) {
        console.warn('Failed to apply fills:', error);
      }
    }

    // Fill opacity: Transparency for background (paint-level)
    if (styles.fillsOpacity) {
      try {
        await applyNodeOpacity(component, styles.fillsOpacity, 'fills', 0);
      } catch (error) {
        console.warn('Failed to apply fill opacity:', error);
      }
    }

    // Strokes: Border color with variable binding support
    if (styles.strokes) {
      try {
        await applyStrokeToken(component, styles.strokes, 0);
      } catch (error) {
        console.warn('Failed to apply strokes:', error);
      }
    }

    // Stroke opacity: Transparency for borders (paint-level)
    if (styles.strokesOpacity) {
      try {
        await applyNodeOpacity(component, styles.strokesOpacity, 'strokes', 0);
      } catch (error) {
        console.warn('Failed to apply stroke opacity:', error);
      }
    }

    // Node opacity: Overall component transparency (recommended for disabled states)
    if (styles.opacity) {
      try {
        await applyNodeOpacity(component, styles.opacity);
      } catch (error) {
        console.warn('Failed to apply node opacity:', error);
      }
    }

    // === DIMENSION PROPERTIES ===
    
    // Stroke weight: Border thickness
    if (styles.strokeWeight) {
      try {
        await applyStrokeWeightToken(component, styles.strokeWeight);
      } catch (error) {
        console.warn('Failed to apply stroke weight:', error);
      }
    }

    // Radius: Corner rounding
    if (styles.radius) {
      try {
        await applyRadiusToken(component, styles.radius);
      } catch (error) {
        console.warn('Failed to apply radius:', error);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in applyComponentStyles';
    console.error('Error in applyComponentStyles:', error);
    throw new Error(errorMessage);
  }
}

/**
 * Create and style a text node with typography properties
 */
async function createStyledTextNode(styles: Style, size: string): Promise<TextNode> {
  try {
    const textNode = figma.createText();
    
    // CRITICAL: Apply font family FIRST before any text operations
    // Must load font before setting other properties to avoid Figma API errors
    if (styles.fontName) {
      try {
        // Use new applyFontNameToken that supports both object and string token formats
        await applyFontNameToken(textNode, styles.fontName);
        console.log(`✅ Font loaded and applied from token/object`);
      } catch (error) {
        console.error('Failed to apply font, using Inter Regular fallback:', error);
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        textNode.fontName = { family: 'Inter', style: 'Regular' };
      }
    } else {
      // Default font - always load before use
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        textNode.fontName = { family: 'Inter', style: 'Regular' };
        console.log('✅ Default font loaded: Inter Regular');
      } catch (error) {
        console.error('CRITICAL: Could not load default font:', error);
        throw new Error('Failed to load default font (Inter Regular). Please ensure it is available in Figma.');
      }
    }
    
    // CRITICAL: Font MUST be loaded before setting textAutoResize, textAlignHorizontal, textAlignVertical
    // Apply text layout configuration (auto-resize and dimensions) AFTER loading font, BEFORE setting text
    // Supports both nested textLayout object and legacy flat structure with smart defaults
    try {
      // Get layout config from nested object or legacy flat structure
      const layoutConfig = styles.textLayout || {
        textAutoResize: styles.textAutoResize,
        width: undefined,
        height: undefined
      };
      
      // Get textAutoResize with fallback to default
      const autoResizeMode = layoutConfig.textAutoResize || "WIDTH_AND_HEIGHT"; // Default for buttons
      
      // Step 1: Set textAutoResize AFTER font is loaded but BEFORE setting characters
      textNode.textAutoResize = autoResizeMode;
      console.log(`📏 Text auto-resize: ${autoResizeMode}`);
      
      // Step 2: Handle NONE mode - MUST call resize() with valid numbers
      if (autoResizeMode === "NONE") {
        const width = layoutConfig.width;
        const height = layoutConfig.height;
        
        // Strict type validation: must be numbers, not strings or undefined
        if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) {
          textNode.resize(width, height);
          console.log(`📐 Text fixed dimensions: ${width}x${height}`);
        } else {
          // Fallback: warn and switch to auto-resize if dimensions invalid
          console.warn(`⚠️ textAutoResize is "NONE" but dimensions invalid (width: ${width}, height: ${height}). Must be positive numbers. Falling back to WIDTH_AND_HEIGHT.`);
          textNode.textAutoResize = "WIDTH_AND_HEIGHT";
        }
      } else if (autoResizeMode === "HEIGHT" && layoutConfig.width) {
        // HEIGHT mode: optionally set width if provided (height auto-grows)
        if (typeof layoutConfig.width === "number" && layoutConfig.width > 0) {
          textNode.resize(layoutConfig.width, textNode.height);
          console.log(`📐 Text width for auto-height: ${layoutConfig.width}`);
        }
      } else if (autoResizeMode === "WIDTH" && layoutConfig.height) {
        // WIDTH mode: optionally set height if provided (width auto-grows)
        if (typeof layoutConfig.height === "number" && layoutConfig.height > 0) {
          textNode.resize(textNode.width, layoutConfig.height);
          console.log(`📐 Text height for auto-width: ${layoutConfig.height}`);
        }
      }
      // WIDTH_AND_HEIGHT or TRUNCATE: no dimensions needed, text auto-sizes
    } catch (error) {
      console.warn('Failed to apply text layout:', error);
    }
    
    // IMPORTANT: Apply text alignment AFTER textAutoResize but BEFORE setting text content
    // Font must be loaded for this property as well
    try {
      applyTextAlignment(textNode, styles.textAlignHorizontal, styles.textAlignVertical);
    } catch (error) {
      console.warn('Failed to apply text alignment:', error);
    }
    
    // Set text content AFTER font, layout, and alignment are configured
    textNode.characters = styles.label || 'Button';

    // Apply typography properties (size, weight, spacing, etc.)
    await applyTypography(textNode, styles, size);

    return textNode;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in createStyledTextNode';
    console.error('Error in createStyledTextNode:', error);
    throw new Error(errorMessage);
  }
}

/**
 * Apply all typography properties to a text node
 */
async function applyTypography(textNode: TextNode, styles: Style, size: string): Promise<void> {
  try {
    // Apply typography tokens (bindable)
    if (styles.fontSize) {
      try {
        await applyFontSizeToken(textNode, styles.fontSize);
      } catch (error) {
        console.warn('Failed to apply fontSize, using fallback:', error);
        textNode.fontSize = getSizeValue(size);
      }
    } else {
      textNode.fontSize = getSizeValue(size);
    }

    // Apply font weight variable binding
    if (styles.fontWeight) {
      try {
        await applyFontWeightToken(textNode, styles.fontWeight);
      } catch (error) {
        console.warn('Failed to apply fontWeight:', error);
      }
    }

    // Apply line height
    if (styles.lineHeight) {
      try {
        await applyLineHeightToken(textNode, styles.lineHeight);
      } catch (error) {
        console.warn('Failed to apply lineHeight:', error);
      }
    }

    // Apply letter spacing
    if (styles.letterSpacing) {
      try {
        await applyLetterSpacingToken(textNode, styles.letterSpacing);
      } catch (error) {
        console.warn('Failed to apply letterSpacing:', error);
      }
    }

    // Apply paragraph spacing
    if (styles.paragraphSpacing) {
      try {
        await applyParagraphSpacingToken(textNode, styles.paragraphSpacing);
      } catch (error) {
        console.warn('Failed to apply paragraphSpacing:', error);
      }
    }

    // NOTE: Text alignment is now applied in createStyledTextNode BEFORE setting text content
    // This ensures proper alignment when text is added to the node

    // Apply text decoration and case (not bindable)
    try {
      applyTextDecoration(textNode, styles.textDecoration);
      applyTextCase(textNode, styles.textCase);
    } catch (error) {
      console.warn('Failed to apply text decoration/case:', error);
    }

    // Apply text color from tokens using variable binding with optional opacity
    if (styles.text) {
      try {
        await applyTextFillToken(textNode, styles.text, styles.textOpacity);
      } catch (error) {
        console.warn('Failed to apply text color:', error);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in applyTypography';
    console.error('Error in applyTypography:', error);
    throw new Error(errorMessage);
  }
}

/**
 * Get font size based on component size
 */
function getSizeValue(size: string): number {
  switch (size) {
    case 'small':
      return 12;
    case 'large':
      return 18;
    case 'medium':
    default:
      return 14;
  }
}
