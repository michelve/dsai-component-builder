import type { ComponentConfig, VariantConfig } from './types';
import {
  applyFillToken,
  applyStrokeToken,
  applyStrokeWeightToken,
  applyRadiusToken,
  applyPaddingTokens,
  applyGapToken,
  applyTextFillToken
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

    // Create a container frame with the component name
    const containerFrame = figma.createFrame();
    containerFrame.name = componentName;
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
    
    // Add container to page
    newPage.appendChild(containerFrame);
    
    console.log(`Creating ${variants.length} component variants...`);

    let createdCount = 0;
    const componentNodes: ComponentNode[] = [];
    let yPosition = 0;
    const spacing = 24;

    // Create each variant as a COMPONENT first (they need to be on the page)
    for (const variantConfig of variants) {
      const component = await createComponentVariant(variantConfig, defaultStyles);
      
      // Position components vertically with spacing
      component.x = 0;
      component.y = yPosition;
      yPosition += component.height + spacing;
      
      componentNodes.push(component);
      newPage.appendChild(component);
      createdCount++;
    }

    // Combine all components into a component set
    const finalComponentSet = figma.combineAsVariants(componentNodes, newPage);
    finalComponentSet.name = componentName;
    
    // Move the component set into the container
    containerFrame.appendChild(finalComponentSet);

    // Select the container
    figma.currentPage.selection = [containerFrame];
    figma.viewport.scrollAndZoomIntoView([containerFrame]);

    return {
      success: true,
      componentsCreated: createdCount,
      message: `Created component set "${componentName}" with ${createdCount} variants`
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
 * Create a single component variant
 */
async function createComponentVariant(
  variantConfig: VariantConfig,
  defaultStyles: ComponentConfig['defaultStyles']
): Promise<ComponentNode> {
  // Merge default styles with variant-specific overrides
  const styles = {
    fills: variantConfig.styles?.fills || defaultStyles.fills,
    strokes: variantConfig.styles?.strokes || defaultStyles.strokes,
    strokeWeight: variantConfig.styles?.strokeWeight || defaultStyles.strokeWeight,
    text: variantConfig.styles?.text || defaultStyles.text,
    radius: variantConfig.styles?.radius || defaultStyles.radius,
    padding: { ...defaultStyles.padding, ...variantConfig.styles?.padding },
    gap: variantConfig.styles?.gap || defaultStyles.gap
  };

  // Create the component
  const component = figma.createComponent();
  component.name = `Variant=${variantConfig.variant}, State=${variantConfig.state}, Size=${variantConfig.size}`;
  
  // Set up auto-layout
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';

  // Set default size
  component.resize(120, 40);
  
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

  // Apply fills (background color) from tokens
  if (styles.fills) {
    await applyFillToken(component, styles.fills);
  }

  // Apply strokes (border) from tokens
  if (styles.strokes) {
    await applyStrokeToken(component, styles.strokes);
  }

  // Apply stroke weight from tokens
  if (styles.strokeWeight) {
    await applyStrokeWeightToken(component, styles.strokeWeight);
  }

  // Apply corner radius from tokens
  if (styles.radius) {
    await applyRadiusToken(component, styles.radius);
  }

  // Create text label
  const textNode = figma.createText();
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  textNode.characters = defaultStyles.label || 'Button';
  textNode.fontSize = getSizeValue(variantConfig.size);

  // Apply text color from tokens using variable binding
  if (styles.text) {
    await applyTextFillToken(textNode, styles.text);
  }

  // Add text to component
  component.appendChild(textNode);

  // Set resize constraints
  component.primaryAxisSizingMode = 'AUTO';
  component.counterAxisSizingMode = 'AUTO';

  return component;
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
