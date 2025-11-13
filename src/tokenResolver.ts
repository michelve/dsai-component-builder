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
    // Validate fallback value
    if (typeof fallbackValue !== 'number' || !Number.isFinite(fallbackValue)) {
      console.warn(`Invalid fallback value: ${fallbackValue}, using 0 instead`);
      fallbackValue = 0;
    }
    
    // Warn about potentially problematic values
    if (fallbackValue < 0) {
      console.warn(`Negative fallback value (${fallbackValue}) may cause unexpected results`);
    }
    
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
    // Ensure fallback is valid even in error case
    const safeFallback = (typeof fallbackValue === 'number' && Number.isFinite(fallbackValue)) ? fallbackValue : 0;
    return {
      found: false,
      fallbackValue: safeFallback
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
    // Use fallback opacity value and validate range (must be 0-1)
    if ('opacity' in node) {
      let opacity = mapping.fallbackValue as number;
      
      // Validate opacity range
      if (typeof opacity !== 'number' || !Number.isFinite(opacity)) {
        console.warn(`Invalid opacity value: ${opacity}, using 1`);
        opacity = 1;
      } else if (opacity < 0) {
        console.warn(`Opacity ${opacity} is negative, clamping to 0`);
        opacity = 0;
      } else if (opacity > 1) {
        console.warn(`Opacity ${opacity} > 1, clamping to 1`);
        opacity = 1;
      }
      
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
      // Create a solid paint and bind the color variable to it
      try {
        let paint: SolidPaint = {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 } // Placeholder color
        };
        
        // Bind color variable to the paint
        paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
        
        // Apply opacity if provided (opacity must be set directly on paint, not via variable binding for fills)
        if (opacityRef) {
          const opacityMapping = await resolveDimensionToken(opacityRef, 1);
          const opacityValue = typeof opacityMapping.fallbackValue === 'number' ? opacityMapping.fallbackValue : 1;
          paint = { ...paint, opacity: opacityValue };
        }
        
        node.fills = [paint];
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
      // Create a solid paint and bind the color variable to it
      try {
        let paint: SolidPaint = {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 } // Placeholder color
        };
        
        // Bind color variable to the paint
        paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
        
        // Apply opacity if provided (opacity must be set directly on paint, not via variable binding for text)
        if (opacityRef) {
          const opacityMapping = await resolveDimensionToken(opacityRef, 1);
          const opacityValue = typeof opacityMapping.fallbackValue === 'number' ? opacityMapping.fallbackValue : 1;
          paint = { ...paint, opacity: opacityValue };
        }
        
        node.fills = [paint];
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
      // Create a solid paint and bind the color variable to it
      try {
        let paint: SolidPaint = {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 } // Placeholder color
        };
        
        // Bind color variable to the paint
        paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
        
        // Apply opacity if provided (opacity must be set directly on paint, not via variable binding for strokes)
        if (opacityRef) {
          const opacityMapping = await resolveDimensionToken(opacityRef, 1);
          const opacityValue = typeof opacityMapping.fallbackValue === 'number' ? opacityMapping.fallbackValue : 1;
          paint = { ...paint, opacity: opacityValue };
        }
        
        node.strokes = [paint];
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
 * Resolve fontName token reference to font family name
 * Supports variable binding for font family (STRING variable)
 * 
 * @param tokenRef - Token reference string (e.g., "{Typography/Base/fontFamily/base}")
 * @param fallbackFamily - Fallback font family if token not found (default: "Inter")
 * @returns Object with font family name and optional variable for binding
 */
export async function resolveFontNameToken(
  tokenRef: TokenReference,
  fallbackFamily: string = 'Inter'
): Promise<{ family: string; variableId?: string }> {
  console.log(`🔍 Resolving fontName token: ${tokenRef}`);
  
  // Extract token name from brackets
  const tokenName = extractTokenName(tokenRef);
  if (!tokenName) {
    console.warn(`⚠️ Invalid fontName token format: ${tokenRef}`);
    return { family: fallbackFamily };
  }
  
  // Try to find the variable
  const variableId = await resolveVariableId(tokenName);
  
  if (variableId) {
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (variable && variable.resolvedType === 'STRING') {
      // Get the value from the variable
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'string') {
        console.log(`✅ Resolved fontName variable: ${variable.name} = ${value}`);
        return { family: value, variableId };
      }
    }
  }
  
  console.warn(`⚠️ Could not resolve fontName token: ${tokenRef}, using fallback: ${fallbackFamily}`);
  return { family: fallbackFamily };
}

/**
 * Apply font name with support for token references and variable binding
 * Supports both object format and token reference string
 * 
 * @param node - Text node to apply font to
 * @param fontNameValue - FontName object OR token reference string
 * @param defaultStyle - Default font style if not specified (default: "Regular")
 */
export async function applyFontNameToken(
  node: TextNode,
  fontNameValue: { family: string; style: string } | string,
  defaultStyle: string = 'Regular'
): Promise<void> {
  try {
    let fontFamily: string;
    let fontStyle: string = defaultStyle;
    let variableId: string | undefined;
    
    // Check if it's a token reference string
    if (typeof fontNameValue === 'string' && fontNameValue.startsWith('{') && fontNameValue.endsWith('}')) {
      console.log(`🔍 Processing fontName token reference: ${fontNameValue}`);
      const resolved = await resolveFontNameToken(fontNameValue, 'Inter');
      fontFamily = resolved.family;
      variableId = resolved.variableId;
    } 
    // Check if it's an object with family and style
    else if (typeof fontNameValue === 'object' && 'family' in fontNameValue) {
      fontFamily = fontNameValue.family;
      fontStyle = fontNameValue.style || defaultStyle;
      console.log(`🔍 Using object fontName: ${fontFamily} ${fontStyle}`);
    }
    // Fallback: treat as direct family name string
    else if (typeof fontNameValue === 'string') {
      fontFamily = fontNameValue;
      console.log(`🔍 Using direct fontFamily string: ${fontFamily}`);
    } else {
      throw new Error('Invalid fontName format');
    }
    
    // Apply the font using existing applyFontName function (handles loading & fallbacks)
    await applyFontName(node, fontFamily, fontStyle);
    
    // If we have a variable, bind it to fontFamily property
    if (variableId) {
      try {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (variable) {
          node.setBoundVariable('fontFamily', variable);
          console.log(`🔗 Bound fontFamily variable: ${variable.name}`);
        }
      } catch (bindError) {
        console.warn(`⚠️ Could not bind fontFamily variable:`, bindError);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error in applyFontNameToken:`, error);
    // Final fallback to Inter Regular
    await applyFontName(node, 'Inter', 'Regular');
  }
}

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
/**
 * Map font weight number to Inter font style name
 */
function getFontStyleForWeight(weight: number, family: string = 'Inter'): string {
  // Inter font weight mappings
  if (family === 'Inter') {
    if (weight <= 100) return 'Thin';
    if (weight <= 200) return 'ExtraLight';
    if (weight <= 300) return 'Light';
    if (weight <= 400) return 'Regular';
    if (weight <= 500) return 'Medium';
    if (weight <= 600) return 'SemiBold';
    if (weight <= 700) return 'Bold';
    if (weight <= 800) return 'ExtraBold';
    return 'Black';
  }
  // Default fallback for other fonts
  if (weight <= 300) return 'Light';
  if (weight <= 400) return 'Regular';
  if (weight <= 500) return 'Medium';
  if (weight <= 600) return 'SemiBold';
  if (weight <= 700) return 'Bold';
  return 'Black';
}

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
      // Get the current font info before binding
      const currentFont = node.fontName;
      const fontFamily = currentFont !== figma.mixed ? currentFont.family : 'Inter';
      
      // Get the font weight value from the variable to determine the style
      const weightValue = typeof mapping.fallbackValue === 'number' ? mapping.fallbackValue : 400;
      const fontStyle = getFontStyleForWeight(weightValue, fontFamily);
      
      console.log(`🔗 Binding fontWeight variable: ${variable.name} (value: ${weightValue} -> style: ${fontStyle})`);
      
      // CRITICAL: Load the font with the new weight BEFORE binding the variable
      // This prevents "Cannot write to node with unloaded font" errors
      try {
        const fontToLoad = { family: fontFamily, style: fontStyle };
        await figma.loadFontAsync(fontToLoad);
        console.log(`✅ Pre-loaded font for weight binding: ${fontToLoad.family} ${fontToLoad.style}`);
      } catch (error) {
        console.warn(`⚠️ Could not pre-load font ${fontFamily} ${fontStyle}, trying Regular fallback:`, error);
        try {
          await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
        } catch (fallbackError) {
          console.warn(`⚠️ Could not load Regular fallback either:`, fallbackError);
        }
      }
      
      // Now bind the variable
      node.setBoundVariable('fontWeight', variable);
      console.log(`✅ Font weight variable bound successfully`);
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



/**
 * Apply text auto-resize to a text node
 * Controls how text node dimensions behave using Figma's textAutoResize property
 * 
 * Values:
 * - "WIDTH_AND_HEIGHT": Auto-both dimensions (hug contents)
 * - "HEIGHT": Auto-height only (hug height, width fixed)
 * - "NONE": Fixed dimensions (both width and height must be set manually via resize)
 * - "TRUNCATE": Truncate with ellipsis when text overflows
 * 
 * Note: Figma does not support "WIDTH" mode (auto-width only). Use "WIDTH_AND_HEIGHT" or "HEIGHT" instead.
 * 
 * IMPORTANT: Font must be loaded before calling this function
 */
export function applyTextAutoResize(
  node: TextNode,
  mode?: "WIDTH_AND_HEIGHT" | "HEIGHT" | "NONE" | "TRUNCATE"
): void {
  if (!mode) {
    // Default to WIDTH_AND_HEIGHT for button/label text
    node.textAutoResize = "WIDTH_AND_HEIGHT";
    console.log(`📏 Text auto-resize: WIDTH_AND_HEIGHT (default)`);
    return;
  }

  node.textAutoResize = mode;
  console.log(`📏 Text auto-resize: ${mode}`);
}

// ============================================
// ADDITIONAL SCOPE SUPPORT (TEXT_CONTENT, WIDTH_HEIGHT, EFFECTS, FONT_STYLE)
// ============================================

/**
 * Apply text content token (TEXT_CONTENT scope)
 * Allows dynamic text controlled by variables
 */
export async function applyTextContentToken(
  node: TextNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Text content token: ${tokenRef}`);
  
  // For string tokens, we need to resolve as a string variable
  const tokenName = extractTokenName(tokenRef);
  const variable = await findVariableByName(tokenName);
  
  if (variable) {
    try {
      // Load the current font before changing text
      await figma.loadFontAsync(node.fontName as FontName);
      
      // Bind the variable to the characters property
      node.setBoundVariable('characters', variable);
      console.log(`🔗 Bound text content variable: ${variable.name}`);
    } catch (error) {
      console.warn(`⚠️ Could not bind text content variable:`, error);
    }
  } else {
    console.warn(`⚠️ Text content variable not found: ${tokenName}`);
  }
}

/**
 * Apply width token (WIDTH_HEIGHT scope)
 * Allows node width to be controlled by variables
 */
export async function applyWidthToken(
  node: SceneNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Width token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 100);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable && 'resize' in node) {
      try {
        node.setBoundVariable('width', variable);
        console.log(`🔗 Bound width variable: ${variable.name}`);
      } catch (error) {
        console.warn(`⚠️ Could not bind width variable:`, error);
      }
    }
  } else {
    if ('resize' in node) {
      const width = mapping.fallbackValue as number || 100;
      node.resize(width, node.height);
      console.log(`⚠️ Using fallback width: ${width}`);
    }
  }
}

/**
 * Apply height token (WIDTH_HEIGHT scope)
 * Allows node height to be controlled by variables
 */
export async function applyHeightToken(
  node: SceneNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Height token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 100);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable && 'resize' in node) {
      try {
        node.setBoundVariable('height', variable);
        console.log(`🔗 Bound height variable: ${variable.name}`);
      } catch (error) {
        console.warn(`⚠️ Could not bind height variable:`, error);
      }
    }
  } else {
    if ('resize' in node) {
      const height = mapping.fallbackValue as number || 100;
      node.resize(node.width, height);
      console.log(`⚠️ Using fallback height: ${height}`);
    }
  }
}

/**
 * Apply paragraph indent token (PARAGRAPH_INDENT scope)
 * Controls first line indent for paragraphs
 */
export async function applyParagraphIndentToken(
  node: TextNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Paragraph indent token: ${tokenRef}`);
  const mapping = await resolveDimensionToken(tokenRef, 0);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    if (variable) {
      try {
        node.setBoundVariable('paragraphIndent', variable);
        console.log(`🔗 Bound paragraphIndent variable: ${variable.name}`);
      } catch (error) {
        console.warn(`⚠️ Could not bind paragraphIndent variable:`, error);
      }
    }
  } else {
    node.paragraphIndent = mapping.fallbackValue as number || 0;
    console.log(`⚠️ Using fallback paragraphIndent: ${mapping.fallbackValue}`);
  }
}

/**
 * Apply font style token (FONT_STYLE scope)
 * Allows font style (Regular, Italic, Bold, etc.) to be controlled by variables
 */
export async function applyFontStyleToken(
  node: TextNode,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Font style token: ${tokenRef}`);
  
  // Font style is a string variable
  const tokenName = extractTokenName(tokenRef);
  const variable = await findVariableByName(tokenName);
  
  if (variable) {
    try {
      // Get current font family
      const currentFont = node.fontName as FontName;
      const fontFamily = currentFont !== figma.mixed ? currentFont.family : 'Inter';
      
      // Get the variable's value to determine the style
      const modeId = Object.keys(variable.valuesByMode)[0];
      const styleValue = variable.valuesByMode[modeId];
      const fontStyle = typeof styleValue === 'string' ? styleValue : 'Regular';
      
      // Load the font with the new style
      await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
      
      // Bind the variable
      node.setBoundVariable('fontStyle', variable);
      console.log(`🔗 Bound fontStyle variable: ${variable.name}`);
    } catch (error) {
      console.warn(`⚠️ Could not bind fontStyle variable:`, error);
    }
  } else {
    console.warn(`⚠️ Font style variable not found: ${tokenName}`);
  }
}

/**
 * Apply effect color token (EFFECT_COLOR scope)
 * Binds a color variable to an effect (shadow, blur, etc.)
 * 
 * Note: This requires the effect to already exist on the node
 */
export async function applyEffectColorToken(
  node: SceneNode & BlendMixin,
  effectIndex: number,
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Effect color token: ${tokenRef} (effect index: ${effectIndex})`);
  
  if (!('effects' in node) || !node.effects || node.effects.length <= effectIndex) {
    console.warn(`⚠️ Node has no effect at index ${effectIndex}`);
    return;
  }
  
  const mapping = await resolveColorToken(tokenRef);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    
    if (variable) {
      try {
        const effect = node.effects[effectIndex];
        
        // Use setBoundVariableForEffect for color binding
        if ('color' in effect) {
          const updatedEffect = figma.variables.setBoundVariableForEffect(
            effect,
            'color',
            variable
          );
          
          // Replace the effect
          const effects = [...node.effects];
          effects[effectIndex] = updatedEffect;
          node.effects = effects;
          
          console.log(`🔗 Bound effect color variable: ${variable.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not bind effect color variable:`, error);
      }
    }
  } else if (mapping.fallbackValue) {
    // Fallback: apply color directly
    const color = mapping.fallbackValue as ResolvedColor;
    const effects = [...node.effects];
    const effect = effects[effectIndex];
    
    if ('color' in effect) {
      (effect as any).color = color;
      node.effects = effects;
      console.log(`⚠️ Using fallback effect color`);
    }
  }
}

/**
 * Apply effect intensity token (EFFECT_FLOAT scope)
 * Binds a number variable to an effect's intensity (radius, spread, etc.)
 * 
 * Note: This requires the effect to already exist on the node
 */
export async function applyEffectIntensityToken(
  node: SceneNode & BlendMixin,
  effectIndex: number,
  property: 'radius' | 'spread' | 'offsetX' | 'offsetY',
  tokenRef: TokenReference
): Promise<void> {
  console.log(`🔍 Effect ${property} token: ${tokenRef} (effect index: ${effectIndex})`);
  
  if (!('effects' in node) || !node.effects || node.effects.length <= effectIndex) {
    console.warn(`⚠️ Node has no effect at index ${effectIndex}`);
    return;
  }
  
  const mapping = await resolveDimensionToken(tokenRef, 0);
  
  if (mapping.found && mapping.variableId) {
    const variable = await figma.variables.getVariableByIdAsync(mapping.variableId);
    
    if (variable) {
      try {
        const effect = node.effects[effectIndex];
        
        // Use setBoundVariableForEffect for intensity binding
        if (property in effect) {
          const updatedEffect = figma.variables.setBoundVariableForEffect(
            effect,
            property,
            variable
          );
          
          // Replace the effect
          const effects = [...node.effects];
          effects[effectIndex] = updatedEffect;
          node.effects = effects;
          
          console.log(`🔗 Bound effect ${property} variable: ${variable.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not bind effect ${property} variable:`, error);
      }
    }
  } else {
    // Fallback: apply value directly
    const value = mapping.fallbackValue as number || 0;
    const effects = [...node.effects];
    const effect = effects[effectIndex];
    
    if (property in effect) {
      (effect as any)[property] = value;
      node.effects = effects;
      console.log(`⚠️ Using fallback effect ${property}: ${value}`);
    }
  }
}

/**
 * Apply specific fill type tokens (FRAME_FILL, SHAPE_FILL scope)
 * These are more specific versions of ALL_FILLS
 * 
 * Note: Currently, we use ALL_FILLS for all fill types, but this function
 * exists for future granular control if needed
 */
export async function applySpecificFillToken(
  node: SceneNode & MinimalFillsMixin,
  fillType: 'FRAME_FILL' | 'SHAPE_FILL',
  tokenRef: TokenReference,
  opacityRef?: TokenReference
): Promise<void> {
  console.log(`🔍 ${fillType} token: ${tokenRef}`);
  
  // For now, delegate to the existing applyFillToken
  // In the future, we could add type-specific logic here
  await applyFillToken(node, tokenRef, opacityRef);
  
  console.log(`✅ Applied ${fillType} (using ALL_FILLS implementation)`);
}


