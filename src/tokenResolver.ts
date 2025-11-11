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
  try {
    if (!tokenRef || typeof tokenRef !== 'string') {
      console.warn('Invalid token reference: must be a non-empty string');
      return '';
    }
    
    const cleaned = tokenRef.replace(/[{}]/g, '').trim();
    
    if (cleaned.length === 0) {
      console.warn(`Empty token name after extraction from: "${tokenRef}"`);
    }
    
    return cleaned;
  } catch (error) {
    console.error(`Error extracting token name from "${tokenRef}":`, error);
    return '';
  }
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
    
    // Extract the last part of the token path for matching
    const tokenParts = tokenName.split('/');
    const lastPart = tokenParts[tokenParts.length - 1]; // e.g., "50" from "Foundation/colors/opacity-decimal/50"
    const lastTwoParts = tokenParts.slice(-2).join('/'); // e.g., "opacity-decimal/50"
    
    console.log(`🔎 Searching for: full="${tokenName}", last="${lastPart}", lastTwo="${lastTwoParts}"`);
    
    for (const variable of localVariables) {
      // Try multiple matching strategies:
      // 1. Exact match on full path
      if (variable.name === tokenName) {
        console.log(`✅ Found exact match: "${variable.name}" (ID: ${variable.id})`);
        return variable;
      }
      
      // 2. Match on last segment only (most common in Figma)
      if (variable.name === lastPart) {
        console.log(`✅ Found by last segment: "${variable.name}" (ID: ${variable.id})`);
        return variable;
      }
      
      // 3. Match if variable name ends with our token path
      if (variable.name.endsWith(tokenName)) {
        console.log(`✅ Found by suffix: "${variable.name}" (ID: ${variable.id})`);
        return variable;
      }
      
      // 4. Match on last two segments
      if (variable.name.endsWith(lastTwoParts)) {
        console.log(`✅ Found by last two segments: "${variable.name}" (ID: ${variable.id})`);
        return variable;
      }
    }
    
    console.log(`❌ Variable not found: "${tokenName}"`);
    if (localVariables.length > 0) {
      console.log(`📝 Sample variable names:`, localVariables.slice(0, 10).map(v => v.name));
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
  try {
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
  } catch (error) {
    console.error(`Error resolving color token "${tokenRef}":`, error);
    const fallbackColor = parseCSSColor(fallbackHex || '#3B82F6');
    return {
      found: false,
      fallbackValue: fallbackColor
    };
  }
}

/**
 * Resolve a dimension token (spacing, radius) to a Figma variable or number
 */
export async function resolveDimensionToken(
  tokenRef: TokenReference,
  fallbackValue: number = 8
): Promise<VariableMapping> {
  try {
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
  } catch (error) {
    console.error(`Error resolving dimension token "${tokenRef}":`, error);
    return {
      found: false,
      fallbackValue: fallbackValue
    };
  }
}

/**
 * Parse CSS color string to Figma RGB format
 * Supports: #RGB, #RRGGBB, #RRGGBBAA
 */
function parseCSSColor(colorString: string): ResolvedColor {
  try {
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
  } catch (error) {
    console.error(`Error parsing color "${colorString}":`, error);
    // Return blue as fallback
    return { r: 0.23, g: 0.51, b: 0.96, a: 1 };
  }
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

// ============================================
// PUBLIC HELPER FUNCTIONS FOR DIRECT ACCESS
// ============================================

/**
 * Resolve a variable path to a Figma variable ID
 * Can be used directly when you need the variable ID
 * 
 * @param variablePath - Token reference like "{Foundation/colors/brand/blue/600}"
 * @returns Variable ID string or empty string if not found
/**
 * Resolve a variable path to its Figma variable ID
 * Public API function for direct variable ID access
 * 
 * @param variablePath - Token reference like "{Foundation/colors/brand/blue/600}"
 * @returns Variable ID string or empty string if not found
 * 
 * @example
 * const varId = await resolveVariableId("{Foundation/colors/brand/blue/600}");
 * node.setBoundVariable('fills', varId);
 */
export async function resolveVariableId(variablePath: string): Promise<string> {
  try {
    // Validate input
    if (!variablePath || typeof variablePath !== 'string') {
      console.error('Invalid variable path: must be a non-empty string');
      return '';
    }

    const tokenName = extractTokenName(variablePath);
    
    // Check if token name is valid after extraction
    if (!tokenName || tokenName.trim().length === 0) {
      console.error(`Invalid token name extracted from: "${variablePath}"`);
      return '';
    }

    const variable = await findVariableByName(tokenName);
    
    if (variable) {
      console.log(`✅ Resolved variable ID for "${tokenName}": ${variable.id}`);
      return variable.id;
    }
    
    console.warn(`⚠️ Could not resolve variable ID for: "${tokenName}"`);
    return '';
  } catch (error) {
    console.error(`Error resolving variable ID for "${variablePath}":`, error);
    return '';
  }
}

/**
 * Resolve a variable path to its numeric value
 * Useful for dimension tokens (spacing, radius, font size, etc.)
 * 
 * @param variablePath - Token reference like "{Spacing/Base/spacing/2}"
 * @param fallback - Default value if variable not found (default: 0)
 * @returns Numeric value or fallback
 * 
 * @example
 * const spacing = await resolveVariableValue("{Spacing/Base/spacing/2}", 8);
 * node.paddingTop = spacing;
 */
export async function resolveVariableValue(
  variablePath: string,
  fallback: number = 0
): Promise<number> {
  try {
    // Validate input
    if (!variablePath || typeof variablePath !== 'string') {
      console.error('Invalid variable path: must be a non-empty string');
      return fallback;
    }

    if (typeof fallback !== 'number' || Number.isNaN(fallback)) {
      console.warn(`Invalid fallback value: ${fallback}, using 0 instead`);
      fallback = 0;
    }

    const tokenName = extractTokenName(variablePath);
    
    if (!tokenName || tokenName.trim().length === 0) {
      console.error(`Invalid token name extracted from: "${variablePath}"`);
      return fallback;
    }

    const variable = await findVariableByName(tokenName);
    
    if (variable && variable.resolvedType === 'FLOAT') {
      // Get the first mode's value
      const modeId = Object.keys(variable.valuesByMode)[0];
      
      if (!modeId) {
        console.warn(`⚠️ No modes found for variable "${tokenName}"`);
        return fallback;
      }

      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'number' && !Number.isNaN(value)) {
        console.log(`✅ Resolved variable value for "${tokenName}": ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Variable "${tokenName}" has non-numeric value: ${value}`);
        return fallback;
      }
    }
    
    console.warn(`⚠️ Could not resolve variable value for: "${tokenName}", using fallback: ${fallback}`);
    return fallback;
  } catch (error) {
    console.error(`Error resolving variable value for "${variablePath}":`, error);
    return fallback;
  }
}

/**
 * Resolve a color variable path to RGB values
 * Returns the color value from the variable or a fallback color
 * 
 * @param variablePath - Token reference like "{Foundation/colors/brand/blue/600}"
 * @param fallbackHex - Hex color string (default: "#3B82F6")
 * @returns ResolvedColor object with r, g, b, a values (0-1 range)
 * 
 * @example
 * const color = await resolveColorVariableValue("{Foundation/colors/brand/blue/600}");
 * node.fills = [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b } }];
 */
export async function resolveColorVariableValue(
  variablePath: string,
  fallbackHex: string = '#3B82F6'
): Promise<ResolvedColor> {
  try {
    // Validate input
    if (!variablePath || typeof variablePath !== 'string') {
      console.error('Invalid variable path: must be a non-empty string');
      return parseCSSColor(fallbackHex);
    }

    if (!fallbackHex || typeof fallbackHex !== 'string') {
      console.warn(`Invalid fallback hex: ${fallbackHex}, using default`);
      fallbackHex = '#3B82F6';
    }

    const tokenName = extractTokenName(variablePath);
    
    if (!tokenName || tokenName.trim().length === 0) {
      console.error(`Invalid token name extracted from: "${variablePath}"`);
      return parseCSSColor(fallbackHex);
    }

    const variable = await findVariableByName(tokenName);
    
    if (variable && variable.resolvedType === 'COLOR') {
      const modeId = Object.keys(variable.valuesByMode)[0];
      
      if (!modeId) {
        console.warn(`⚠️ No modes found for color variable "${tokenName}"`);
        return parseCSSColor(fallbackHex);
      }

      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value) {
        // Validate color values are in correct range
        const color = value as ResolvedColor;
        if (typeof color.r === 'number' && typeof color.g === 'number' && typeof color.b === 'number') {
          console.log(`✅ Resolved color value for "${tokenName}":`, color);
          return color;
        } else {
          console.warn(`⚠️ Invalid color value types for "${tokenName}"`);
          return parseCSSColor(fallbackHex);
        }
      } else {
        console.warn(`⚠️ Color variable "${tokenName}" has invalid value structure`);
        return parseCSSColor(fallbackHex);
      }
    }
    
    console.warn(`⚠️ Could not resolve color variable: "${tokenName}", using fallback: ${fallbackHex}`);
    return parseCSSColor(fallbackHex);
  } catch (error) {
    console.error(`Error resolving color variable for "${variablePath}":`, error);
    return parseCSSColor(fallbackHex);
  }
}

/**
 * Check if a variable exists in the current document
 * 
 * @param variablePath - Token reference like "{Foundation/colors/brand/blue/600}"
 * @returns true if variable exists, false otherwise
 * 
 * @example
 * if (await variableExists("{Foundation/colors/brand/blue/600}")) {
 *   // Apply variable binding
 * } else {
 *   // Use fallback value
 * }
 */
export async function variableExists(variablePath: string): Promise<boolean> {
  try {
    // Validate input
    if (!variablePath || typeof variablePath !== 'string') {
      console.error('Invalid variable path: must be a non-empty string');
      return false;
    }

    const tokenName = extractTokenName(variablePath);
    
    if (!tokenName || tokenName.trim().length === 0) {
      console.error(`Invalid token name extracted from: "${variablePath}"`);
      return false;
    }

    const variable = await findVariableByName(tokenName);
    const exists = variable !== null;
    
    if (exists) {
      console.log(`✅ Variable exists: "${tokenName}"`);
    } else {
      console.log(`❌ Variable does not exist: "${tokenName}"`);
    }
    
    return exists;
  } catch (error) {
    console.error(`Error checking if variable exists for "${variablePath}":`, error);
    return false;
  }
}

// ============================================
// STYLE APPLICATION FUNCTIONS
// ============================================

/**
 * Apply node-level opacity token
 * This controls the entire node's opacity (recommended approach)
 * Expects opacity values in 0-1 range (e.g., 0.5 for 50%)
 */
export async function applyNodeOpacity(
  node: SceneNode,
  opacityRef: TokenReference
): Promise<void> {
  const mapping = await resolveDimensionToken(opacityRef, 1);
  
  console.log(`🔍 Opacity token: ${opacityRef}`);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable && 'opacity' in node) {
      console.log(`✅ Found opacity variable: ${variable.name}`);
      
      // Get the variable's value to check the range
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      console.log(`📊 Variable value: ${value} (type: ${typeof value})`);
      
      // Bind the variable to the node's opacity property
      node.setBoundVariable('opacity', variable);
      console.log(`🔗 Bound opacity variable to node`);
    }
  } else {
    // Use fallback opacity value (already in 0-1 range)
    if ('opacity' in node) {
      const opacity = mapping.fallbackValue as number;
      node.opacity = opacity;
      console.log(`⚠️ Using fallback opacity: ${opacity}`);
    }
  }
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
          const opacityMapping = await resolveDimensionToken(opacityRef, 1);
          if (opacityMapping.found && opacityMapping.variableId) {
            const opacityVariable = await figma.variables.getVariableByIdAsync(opacityMapping.variableId);
            if (opacityVariable) {
              // @ts-expect-error - setBoundVariableForPaint may not be in types yet
              figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'opacity', opacityVariable);
            }
          } else {
            // Use fallback opacity value (already in 0-1 range)
            const fills = node.fills as SolidPaint[];
            if (fills[0] && fills[0].type === 'SOLID') {
              node.fills = [{
                ...fills[0],
                opacity: opacityMapping.fallbackValue as number
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
      const opacityMapping = await resolveDimensionToken(opacityRef, 1);
      opacity = opacityMapping.fallbackValue as number;
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
          const opacityMapping = await resolveDimensionToken(opacityRef, 1);
          if (opacityMapping.found && opacityMapping.variableId) {
            const opacityVariable = await figma.variables.getVariableByIdAsync(opacityMapping.variableId);
            if (opacityVariable) {
              // @ts-expect-error - setBoundVariableForPaint may not be in types yet
              figma.variables.setBoundVariableForPaint(node, 'fills', 0, 'opacity', opacityVariable);
            }
          } else {
            // Use fallback opacity value (already in 0-1 range)
            const fills = node.fills as SolidPaint[];
            if (fills[0] && fills[0].type === 'SOLID') {
              node.fills = [{
                ...fills[0],
                opacity: opacityMapping.fallbackValue as number
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
    let opacity = color.a || 1;
    
    // Apply opacity if provided
    if (opacityRef) {
      const opacityMapping = await resolveDimensionToken(opacityRef, 1);
      opacity = opacityMapping.fallbackValue as number;
    }
    
    node.fills = [{
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b },
      opacity: opacity
    }];
  }
}

/**
 * Apply stroke token to a node with optional opacity
 */
export async function applyStrokeToken(
  node: SceneNode & MinimalStrokesMixin,
  tokenRef: TokenReference,
  opacityRef?: TokenReference
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
        
        // Apply opacity if provided
        if (opacityRef) {
          const opacityMapping = await resolveDimensionToken(opacityRef, 1);
          if (opacityMapping.found && opacityMapping.variableId) {
            const opacityVariable = await figma.variables.getVariableByIdAsync(opacityMapping.variableId);
            if (opacityVariable) {
              // @ts-expect-error - setBoundVariableForPaint may not be in types yet
              figma.variables.setBoundVariableForPaint(node, 'strokes', 0, 'opacity', opacityVariable);
            }
          } else {
            // Use fallback opacity value (already in 0-1 range)
            const strokes = node.strokes as SolidPaint[];
            if (strokes[0] && strokes[0].type === 'SOLID') {
              node.strokes = [{
                ...strokes[0],
                opacity: opacityMapping.fallbackValue as number
              }];
            }
          }
        }
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
    let opacity = 1;
    
    // Apply opacity if provided
    if (opacityRef) {
      const opacityMapping = await resolveDimensionToken(opacityRef, 1);
      opacity = opacityMapping.fallbackValue as number;
    }
    
    node.strokes = [{
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b },
      opacity: opacity
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

// ============================================
// TYPOGRAPHY FUNCTIONS
// ============================================

/**
 * Apply font family to a text node (without weight)
 * Must load font before setting
 */
export async function applyFontName(
  node: TextNode,
  fontFamily: string,
  fontStyle: string = 'Regular'
): Promise<void> {
  console.log(`🔤 Applying font: ${fontFamily} ${fontStyle}`);
  
  const fontName = { family: fontFamily, style: fontStyle };
  
  try {
    // Load the font before applying - CRITICAL for Figma API
    await figma.loadFontAsync(fontName);
    node.fontName = fontName;
    console.log(`✅ Font applied: ${fontName.family} ${fontName.style}`);
  } catch (error) {
    console.warn(`⚠️ Could not load font ${fontFamily} ${fontStyle}, trying Regular:`, error);
    try {
      // Fallback to Regular if the style doesn't exist
      const fallbackFont = { family: fontFamily, style: 'Regular' };
      await figma.loadFontAsync(fallbackFont);
      node.fontName = fallbackFont;
      console.log(`✅ Fallback font applied: ${fallbackFont.family} ${fallbackFont.style}`);
    } catch (fallbackError) {
      console.warn(`⚠️ Could not load font ${fontFamily} Regular, trying Inter Regular:`, fallbackError);
      try {
        // Final fallback to Inter Regular (default system font)
        const systemFont = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(systemFont);
        node.fontName = systemFont;
        console.log(`✅ System font applied: ${systemFont.family} ${systemFont.style}`);
      } catch (systemError) {
        console.error(`❌ CRITICAL: Could not load any font. Text may not display correctly:`, systemError);
        throw new Error(`Failed to load any font. Original: ${fontFamily} ${fontStyle}`);
      }
    }
  }
}

/**
 * Apply font weight token to a text node (bindable as FLOAT variable 100-900)
 */
export async function applyFontWeightToken(
  node: TextNode,
  tokenRef: TokenReference | number
): Promise<void> {
  // If it's a direct number value, use it as fallback
  if (typeof tokenRef === 'number') {
    console.log(`⚠️ Direct font weight value: ${tokenRef}`);
    // Note: fontWeight property requires variable binding, fallback to fontName style mapping
    return;
  }
  
  console.log(`🔍 Font weight token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 400);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      node.setBoundVariable('fontWeight', variable);
      console.log(`🔗 Bound fontWeight variable: ${variable.name}`);
    }
  } else {
    // Fallback: fontWeight requires variable binding, so we can't set a direct value
    // User should use fontName.style instead for non-variable weights
    console.warn(`⚠️ Font weight requires variable binding. Fallback value: ${mapping.fallbackValue}`);
  }
}

/**
 * Apply font size token to a text node (bindable)
 */
export async function applyFontSizeToken(
  node: TextNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Font size token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 16);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      node.setBoundVariable('fontSize', variable);
      console.log(`🔗 Bound fontSize variable: ${variable.name}`);
    }
  } else {
    node.fontSize = mapping.fallbackValue as number || 16;
    console.log(`⚠️ Using fallback fontSize: ${mapping.fallbackValue}`);
  }
}

/**
 * Apply line height token to a text node (bindable)
 * Supports AUTO or {value, unit} format
 */
export async function applyLineHeightToken(
  node: TextNode,
  tokenRef: TokenReference | 'AUTO'
): Promise<void> {
  console.log(`🔍 Line height token: ${tokenRef}`);
  
  // Handle AUTO case
  if (tokenRef === 'AUTO') {
    node.lineHeight = { unit: 'AUTO' };
    console.log(`⚠️ Using AUTO line height`);
    return;
  }
  
  const mapping = await resolveDimensionToken(tokenRef, 140);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      node.setBoundVariable('lineHeight', variable);
      console.log(`🔗 Bound lineHeight variable: ${variable.name}`);
    }
  } else {
    // Fallback: interpret as percentage (e.g., 140 = 140%)
    const value = mapping.fallbackValue as number || 140;
    node.lineHeight = { value, unit: 'PERCENT' };
    console.log(`⚠️ Using fallback lineHeight: ${value}%`);
  }
}

/**
 * Apply letter spacing token to a text node (bindable)
 */
export async function applyLetterSpacingToken(
  node: TextNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Letter spacing token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 0);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      node.setBoundVariable('letterSpacing', variable);
      console.log(`🔗 Bound letterSpacing variable: ${variable.name}`);
    }
  } else {
    // Fallback: assume percentage value
    const value = mapping.fallbackValue as number || 0;
    node.letterSpacing = { value, unit: 'PERCENT' };
    console.log(`⚠️ Using fallback letterSpacing: ${value}%`);
  }
}

/**
 * Apply paragraph spacing token to a text node (bindable)
 */
export async function applyParagraphSpacingToken(
  node: TextNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Paragraph spacing token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 0);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      node.setBoundVariable('paragraphSpacing', variable);
      console.log(`🔗 Bound paragraphSpacing variable: ${variable.name}`);
    }
  } else {
    node.paragraphSpacing = mapping.fallbackValue as number || 0;
    console.log(`⚠️ Using fallback paragraphSpacing: ${mapping.fallbackValue}`);
  }
}

/**
 * Apply text alignment (horizontal and vertical)
 */
export function applyTextAlignment(
  node: TextNode,
  horizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED",
  vertical?: "TOP" | "CENTER" | "BOTTOM"
): void {
  if (horizontal) {
    node.textAlignHorizontal = horizontal;
    console.log(`↔️ Text align horizontal: ${horizontal}`);
  }
  if (vertical) {
    node.textAlignVertical = vertical;
    console.log(`↕️ Text align vertical: ${vertical}`);
  }
}

/**
 * Apply text decoration (underline, strikethrough)
 */
export function applyTextDecoration(
  node: TextNode,
  decoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH"
): void {
  if (decoration) {
    node.textDecoration = decoration;
    console.log(`🎨 Text decoration: ${decoration}`);
  }
}

/**
 * Apply text case transformation
 */
export function applyTextCase(
  node: TextNode,
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" | "SMALL_CAPS"
): void {
  if (textCase) {
    node.textCase = textCase;
    console.log(`🔤 Text case: ${textCase}`);
  }
}


