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
  applyFontName,
  applyFontSizeToken,
  applyFontWeightToken,
  applyLineHeightToken,
  applyLetterSpacingToken,
  applyParagraphSpacingToken,
  applyTextAlignment,
  applyTextDecoration,
  applyTextCase
} from './tokenResolver';

/**
 * Component Builder
 * Creates Figma components from JSON configuration
 */

interface BuildResult {
  success: boolean;
  componentsCreated?: number;
  error?: string;
  message?: string;
}

/**
 * Main function to load JSON and create components
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
 * Create a container frame for the component set
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
 * Create a component set from configuration
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
 * Create a single component variant
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
 * Merge variant styles with default styles
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
 * Create base component with layout settings
 */
function createBaseComponent(variantConfig: Variant): ComponentNode {
  const component = figma.createComponent();
  component.name = `Variant=${variantConfig.variant}, State=${variantConfig.state}, Size=${variantConfig.size}`;
  
  // Set up auto-layout
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.resize(120, 40); // Initial size

  return component;
}

/**
 * Apply all visual styles to component (fills, strokes, spacing, etc.)
 */
async function applyComponentStyles(component: ComponentNode, styles: Style): Promise<void> {
  try {
    // Apply padding from tokens using variable binding
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

    // Apply gap from tokens
    if (styles.gap) {
      try {
        await applyGapToken(component, styles.gap);
      } catch (error) {
        console.warn('Failed to apply gap:', error);
      }
    }

    // Apply fills with token binding
    if (styles.fills) {
      try {
        await applyFillToken(component, styles.fills, 0);
      } catch (error) {
        console.warn('Failed to apply fills:', error);
      }
    }

    // Apply fill opacity
    if (styles.fillsOpacity) {
      try {
        await applyNodeOpacity(component, styles.fillsOpacity, 'fills', 0);
      } catch (error) {
        console.warn('Failed to apply fill opacity:', error);
      }
    }

    // Apply strokes with token binding
    if (styles.strokes) {
      try {
        await applyStrokeToken(component, styles.strokes, 0);
      } catch (error) {
        console.warn('Failed to apply strokes:', error);
      }
    }

    // Apply stroke opacity
    if (styles.strokesOpacity) {
      try {
        await applyNodeOpacity(component, styles.strokesOpacity, 'strokes', 0);
      } catch (error) {
        console.warn('Failed to apply stroke opacity:', error);
      }
    }

    // Apply stroke weight with token binding
    if (styles.strokeWeight) {
      try {
        await applyStrokeWeightToken(component, styles.strokeWeight);
      } catch (error) {
        console.warn('Failed to apply stroke weight:', error);
      }
    }

    // Apply radius with token binding
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
        await applyFontName(textNode, styles.fontName.family, styles.fontName.style);
        console.log(`✅ Font loaded and applied: ${styles.fontName.family} ${styles.fontName.style}`);
      } catch (error) {
        console.error('Failed to apply custom font, using Inter Regular fallback:', error);
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
    
    // Set text content AFTER font is loaded
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

    // Apply text alignment (not bindable)
    try {
      applyTextAlignment(textNode, styles.textAlignHorizontal, styles.textAlignVertical);
    } catch (error) {
      console.warn('Failed to apply text alignment:', error);
    }

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
