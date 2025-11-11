import { TokenReference, VariableMapping, ResolvedColor } from './types';

/**
 * Token Resolver
 * Maps JSON token references to Figma variables or fallback values
 */

/**
 * Extract token name from reference string
 * Example: "{Foundation/colors/brand/blue/600}" -> "Foundation/colors/brand/blue/600"
 */
function extractTokenName(tokenRef: TokenReference): string {
  return tokenRef.replace(/[{}]/g, '');
}

/**
 * Find a Figma variable by name
 * Searches through all local variables in the document
 */
async function findVariableByName(tokenName: string): Promise<Variable | null> {
  try {
    const localVariables = await figma.variables.getLocalVariablesAsync();
    
    console.log(`🔍 Looking for variable: "${tokenName}"`);
    console.log(`📊 Total local variables: ${localVariables.length}`);
    
    for (const variable of localVariables) {
      // Match by name or by collection path
      if (variable.name === tokenName || 
          variable.name.includes(tokenName) ||
          tokenName.includes(variable.name)) {
        console.log(`✅ Found variable: "${variable.name}" (ID: ${variable.id})`);
        return variable;
      }
    }
    
    console.log(`❌ Variable not found: "${tokenName}"`);
    if (localVariables.length > 0) {
      console.log(`📝 Sample variable names:`, localVariables.slice(0, 5).map(v => v.name));
    }
    
    return null;
  } catch (error) {
    console.error('Error finding variable:', error);
    return null;
  }
}

/**
 * Resolve a color token to a Figma variable binding or fallback color
 */
export async function resolveColorToken(
  tokenRef: TokenReference,
  fallbackHex?: string
): Promise<VariableMapping> {
  const tokenName = extractTokenName(tokenRef);
  const variable = await findVariableByName(tokenName);

  if (variable && variable.resolvedType === 'COLOR') {
    return {
      found: true,
      variableId: variable.id
    };
  }

  // Fallback to default color if variable not found
  const fallbackColor = parseCSSColor(fallbackHex || '#3B82F6');
  return {
    found: false,
    fallbackValue: fallbackColor
  };
}

/**
 * Resolve a dimension token (spacing, radius) to a Figma variable or number
 */
export async function resolveDimensionToken(
  tokenRef: TokenReference,
  fallbackValue: number = 8
): Promise<VariableMapping> {
  const tokenName = extractTokenName(tokenRef);
  const variable = await findVariableByName(tokenName);

  if (variable && variable.resolvedType === 'FLOAT') {
    return {
      found: true,
      variableId: variable.id
    };
  }

  // Fallback to default dimension
  return {
    found: false,
    fallbackValue: fallbackValue
  };
}

/**
 * Parse CSS color string to Figma RGB format
 * Supports: #RGB, #RRGGBB, #RRGGBBAA
 */
function parseCSSColor(colorString: string): ResolvedColor {
  let hex = colorString.replace('#', '');

  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

/**
 * Parse CSS variable name to extract potential color value
 * Example: "var(--bs-blue-600)" -> attempts to find matching variable
 */
export async function resolveCSSVariable(
  cssVar: string
): Promise<VariableMapping> {
  // Extract variable name from CSS var() syntax
  const match = cssVar.match(/var\((--[\w-]+)\)/);
  if (match) {
    const varName = match[1];
    return await resolveColorToken(varName);
  }

  return {
    found: false,
    fallbackValue: { r: 0.23, g: 0.51, b: 0.96 } // Default blue
  };
}

/**
 * Apply color variable or fallback to a node's fills with optional opacity
 */
export async function applyFillToken(
  node: SceneNode & MinimalFillsMixin,
  tokenRef: TokenReference,
  opacityRef?: TokenReference
): Promise<void> {
  const mapping = await resolveColorToken(tokenRef);

  if (mapping.found && mapping.variableId) {
    // Get the actual Variable object
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    
    if (variable) {
      // Create a solid paint first
      node.fills = [{
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0 } // Placeholder
      }];
      
      // Use the helper method: setBoundVariableForPaint(node, field, paintIndex, property, variable)
      // Based on Figma docs: figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'color', variable)
      try {
        // @ts-expect-error - setBoundVariableForPaint may not be in types yet
        figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'color', variable);
        
        // Apply opacity if provided
        if (opacityRef) {
          const opacityMapping = await resolveDimensionToken(opacityRef, 100);
          if (opacityMapping.found && opacityMapping.variableId) {
            const opacityVariable = await figma.variables.getVariableByIdAsync(opacityMapping.variableId);
            if (opacityVariable) {
              // @ts-expect-error - setBoundVariableForPaint may not be in types yet
              figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'opacity', opacityVariable);
            }
          } else {
            // Use fallback opacity value (convert from 0-100 to 0-1)
            const fills = node.fills as SolidPaint[];
            if (fills[0] && fills[0].type === 'SOLID') {
              node.fills = [{
                ...fills[0],
                opacity: (opacityMapping.fallbackValue as number) / 100
              }];
            }
          }
        }
      } catch (_error) {
        console.log('⚠️ setBoundVariableForPaint not available, using fallback');
        // Fallback: use the old boundVariables syntax
        node.fills = [{
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 },
          boundVariables: {
            color: {
              type: 'VARIABLE_ALIAS',
              id: mapping.variableId
            }
          }
        } as SolidPaint];
      }
    }
  } else if (mapping.fallbackValue) {
    // Use fallback color
    const color = mapping.fallbackValue as ResolvedColor;
    let opacity = color.a || 1;
    
    // Apply opacity if provided
    if (opacityRef) {
      const opacityMapping = await resolveDimensionToken(opacityRef, 100);
      opacity = (opacityMapping.fallbackValue as number) / 100;
    }
    
    node.fills = [{
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b },
      opacity: opacity
    }];
  }
}

/**
 * Apply text fill token to a text node with optional opacity
 */
export async function applyTextFillToken(
  node: TextNode,
  tokenRef: TokenReference,
  opacityRef?: TokenReference
): Promise<void> {
  const mapping = await resolveColorToken(tokenRef);

  if (mapping.found && mapping.variableId) {
    // Get the actual Variable object
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    
    if (variable) {
      // Create a solid paint first
      node.fills = [{
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0 } // Placeholder
      }];
      
      // Use the helper method to bind the variable
      try {
        // @ts-expect-error - setBoundVariableForPaint may not be in types yet
        figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'color', variable);
        
        // Apply opacity if provided
        if (opacityRef) {
          const opacityMapping = await resolveDimensionToken(opacityRef, 100);
          if (opacityMapping.found && opacityMapping.variableId) {
            const opacityVariable = await figma.variables.getVariableByIdAsync(opacityMapping.variableId);
            if (opacityVariable) {
              // @ts-expect-error - setBoundVariableForPaint may not be in types yet
              figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'opacity', opacityVariable);
            }
          } else {
            // Use fallback opacity value (convert from 0-100 to 0-1)
            const fills = node.fills as SolidPaint[];
            if (fills[0] && fills[0].type === 'SOLID') {
              node.fills = [{
                ...fills[0],
                opacity: (opacityMapping.fallbackValue as number) / 100
              }];
            }
          }
        }
      } catch (_error) {
        console.log('⚠️ setBoundVariableForPaint not available for text, using fallback');
        // Fallback: use the old boundVariables syntax
        node.fills = [{
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 },
          boundVariables: {
            color: {
              type: 'VARIABLE_ALIAS',
              id: mapping.variableId
            }
          }
        } as SolidPaint];
      }
    }
  } else if (mapping.fallbackValue) {
    // Use fallback color
    const color = mapping.fallbackValue as ResolvedColor;
    node.fills = [{
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b },
      opacity: color.a || 1
    }];
  }
}

/**
 * Apply stroke token to a node
 */
export async function applyStrokeToken(
  node: SceneNode & MinimalStrokesMixin,
  tokenRef: TokenReference
): Promise<void> {
  const mapping = await resolveColorToken(tokenRef);

  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    
    if (variable) {
      // Create a solid stroke first
      node.strokes = [{
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0 } // Placeholder
      }];
      
      try {
        // @ts-expect-error - setBoundVariableForPaint may not be in types yet
        figma.variables.setBoundVariableForPaint(node, 'strokes', 0, 'color', variable);
      } catch (_error) {
        console.log('⚠️ setBoundVariableForPaint not available for strokes, using fallback');
        // Fallback: use the old boundVariables syntax
        node.strokes = [{
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 },
          boundVariables: {
            color: {
              type: 'VARIABLE_ALIAS',
              id: mapping.variableId
            }
          }
        } as SolidPaint];
      }
    }
  } else if (mapping.fallbackValue) {
    const color = mapping.fallbackValue as ResolvedColor;
    node.strokes = [{
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b }
    }];
  }

  // Note: Stroke weight is handled separately by applyStrokeWeightToken()
}

/**
 * Apply stroke weight token to a node
 */
export async function applyStrokeWeightToken(
  node: SceneNode & MinimalStrokesMixin,
  tokenRef: TokenReference
): Promise<void> {
  const mapping = await resolveDimensionToken(tokenRef, 1);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable && 'strokeWeight' in node) {
      node.setBoundVariable('strokeWeight', variable);
    }
  } else {
    if ('strokeWeight' in node) {
      node.strokeWeight = mapping.fallbackValue as number || 1;
    }
  }
}

/**
 * Apply corner radius token to a node
 */
export async function applyRadiusToken(
  node: SceneNode & CornerMixin,
  tokenRef: TokenReference
): Promise<void> {
  const mapping = await resolveDimensionToken(tokenRef, 4);

  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    
    if (variable) {
      // Bind all corner radii to the same variable
      node.setBoundVariable('topLeftRadius', variable);
      node.setBoundVariable('topRightRadius', variable);
      node.setBoundVariable('bottomLeftRadius', variable);
      node.setBoundVariable('bottomRightRadius', variable);
    }
  } else {
    // Use fallback value
    node.cornerRadius = mapping.fallbackValue as number || 4;
  }
}

/**
 * Apply padding tokens to an auto-layout node
 */
export async function applyPaddingTokens(
  node: FrameNode | ComponentNode,
  paddingTokens: {
    top: TokenReference;
    bottom: TokenReference;
    left: TokenReference;
    right: TokenReference;
  }
): Promise<void> {
  const topMapping = await resolveDimensionToken(paddingTokens.top, 8);
  const bottomMapping = await resolveDimensionToken(paddingTokens.bottom, 8);
  const leftMapping = await resolveDimensionToken(paddingTokens.left, 12);
  const rightMapping = await resolveDimensionToken(paddingTokens.right, 12);

  // Bind variables if found, otherwise use fallback values
  if (topMapping.found && topMapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(topMapping.variableId);
    if (variable) node.setBoundVariable('paddingTop', variable);
  } else {
    node.paddingTop = topMapping.fallbackValue as number || 8;
  }

  if (bottomMapping.found && bottomMapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(bottomMapping.variableId);
    if (variable) node.setBoundVariable('paddingBottom', variable);
  } else {
    node.paddingBottom = bottomMapping.fallbackValue as number || 8;
  }

  if (leftMapping.found && leftMapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(leftMapping.variableId);
    if (variable) node.setBoundVariable('paddingLeft', variable);
  } else {
    node.paddingLeft = leftMapping.fallbackValue as number || 12;
  }

  if (rightMapping.found && rightMapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(rightMapping.variableId);
    if (variable) node.setBoundVariable('paddingRight', variable);
  } else {
    node.paddingRight = rightMapping.fallbackValue as number || 12;
  }
}

/**
 * Apply item spacing (gap) token to an auto-layout node
 */
export async function applyGapToken(
  node: FrameNode | ComponentNode,
  tokenRef: TokenReference
): Promise<void> {
  const mapping = await resolveDimensionToken(tokenRef, 8);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      node.setBoundVariable('itemSpacing', variable);
    }
  } else {
    node.itemSpacing = mapping.fallbackValue as number || 8;
  }
}
