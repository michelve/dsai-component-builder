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
    const { componentSet: componentSetInfo, defaultStyles, variants } = config;
    const componentName = componentSetInfo.name || 'Button Component';

    // Create a new page for this component
    const newPage = figma.createPage();
    newPage.name = componentName;
    await figma.setCurrentPageAsync(newPage);

    console.log(`Creating component set "${componentName}" with ${variants.length} variants...`);

    // Create the component set with all variants
    const componentSet = await createComponentSet(config);
    
    // Create a container frame
    const containerFrame = createContainerFrame(componentName);
    containerFrame.appendChild(componentSet);
    newPage.appendChild(containerFrame);

    // Select and focus on the container
    figma.currentPage.selection = [containerFrame];
    figma.viewport.scrollAndZoomIntoView([containerFrame]);

    return {
      success: true,
      componentsCreated: variants.length,
      message: `Created component set "${componentName}" with ${variants.length} variants`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating components:', error);
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
  const { componentSet: componentSetInfo, defaultStyles, variants } = config;
  const componentNodes: ComponentNode[] = [];
  let yPosition = 0;
  const spacing = 24;

  // Create each variant as a component
  for (const variant of variants) {
    const component = await createComponentVariant(variant, defaultStyles);
    
    // Position components vertically with spacing
    component.x = 0;
    component.y = yPosition;
    yPosition += component.height + spacing;
    
    componentNodes.push(component);
    figma.currentPage.appendChild(component);
  }

  // Combine all components into a component set
  const componentSet = figma.combineAsVariants(componentNodes, figma.currentPage);
  componentSet.name = componentSetInfo.name;
  
  return componentSet;
}

/**
 * Create a single component variant
 */
async function createComponentVariant(
  variantConfig: Variant,
  defaultStyles: Style
): Promise<ComponentNode> {
  // Merge default styles with variant-specific overrides
  const styles = mergeStyles(variantConfig, defaultStyles);

  // Create the component with basic setup
  const component = createBaseComponent(variantConfig);
  
  // Apply all styles to the component
  await applyComponentStyles(component, styles);
  
  // Create and style the text node
  const textNode = await createStyledTextNode(styles, variantConfig.size);
  component.appendChild(textNode);

  // Set resize constraints
  component.primaryAxisSizingMode = 'AUTO';
  component.counterAxisSizingMode = 'AUTO';

  return component;
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
  // Apply padding from tokens using variable binding
  if (styles.padding) {
    await applyPaddingTokens(component, {
      top: styles.padding.top || '{Spacing/Base/spacing/2}',
      bottom: styles.padding.bottom || '{Spacing/Base/spacing/2}',
      left: styles.padding.left || '{Spacing/Base/spacing/3}',
      right: styles.padding.right || '{Spacing/Base/spacing/3}'
    });
  }
  
  // Apply gap using variable binding
  if (styles.gap) {
    await applyGapToken(component, styles.gap);
  }

  // Apply fills (background color) from tokens with optional opacity
  if (styles.fills) {
    await applyFillToken(component, styles.fills, styles.fillsOpacity);
  }

  // Apply strokes (border) from tokens with optional opacity
  if (styles.strokes) {
    await applyStrokeToken(component, styles.strokes, styles.strokesOpacity);
  }

  // Apply stroke weight from tokens
  if (styles.strokeWeight) {
    await applyStrokeWeightToken(component, styles.strokeWeight);
  }

  // Apply corner radius from tokens
  if (styles.radius) {
    await applyRadiusToken(component, styles.radius);
  }

  // Apply node-level opacity (affects entire component)
  if (styles.opacity) {
    await applyNodeOpacity(component, styles.opacity);
  }
}

/**
 * Create and style a text node with typography properties
 */
async function createStyledTextNode(styles: Style, size: string): Promise<TextNode> {
  const textNode = figma.createText();
  
  // Apply font family first (must load font before setting other properties)
  if (styles.fontName) {
    await applyFontName(textNode, styles.fontName.family, styles.fontName.style);
  } else {
    // Default font
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    textNode.fontName = { family: 'Inter', style: 'Regular' };
  }
  
  textNode.characters = styles.label || 'Button';

  // Apply typography properties
  await applyTypography(textNode, styles, size);

  return textNode;
}

/**
 * Apply all typography properties to a text node
 */
async function applyTypography(textNode: TextNode, styles: Style, size: string): Promise<void> {
  // Apply typography tokens (bindable)
  if (styles.fontSize) {
    await applyFontSizeToken(textNode, styles.fontSize);
  } else {
    textNode.fontSize = getSizeValue(size);
  }

  // Apply font weight variable binding
  if (styles.fontWeight) {
    await applyFontWeightToken(textNode, styles.fontWeight);
  }

  if (styles.lineHeight) {
    await applyLineHeightToken(textNode, styles.lineHeight);
  }

  if (styles.letterSpacing) {
    await applyLetterSpacingToken(textNode, styles.letterSpacing);
  }

  if (styles.paragraphSpacing) {
    await applyParagraphSpacingToken(textNode, styles.paragraphSpacing);
  }

  // Apply text alignment (not bindable)
  applyTextAlignment(textNode, styles.textAlignHorizontal, styles.textAlignVertical);

  // Apply text decoration and case (not bindable)
  applyTextDecoration(textNode, styles.textDecoration);
  applyTextCase(textNode, styles.textCase);

  // Apply text color from tokens using variable binding with optional opacity
  if (styles.text) {
    await applyTextFillToken(textNode, styles.text, styles.textOpacity);
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
