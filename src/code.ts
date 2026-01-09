import { ComponentConfig, PluginMessage } from './types';
import { loadJSONAndCreateComponents } from './componentBuilder';

/**
 * Figma Plugin: DSAi Component Builder
 * 
 * This plugin converts JSON configuration files into Figma component sets with
 * full design token support and variable binding.
 * 
 * Features:
 * - Creates component variants from JSON structure
 * - Binds Figma variables to component properties
 * - Supports comprehensive styling (colors, spacing, typography, etc.)
 * - Handles multiple variants (primary/secondary, states, sizes)
 * 
 * @module code
 * @copyright Copyright (c) 2025. All rights reserved.
 * @license Proprietary - All rights reserved. Unauthorized copying, modification, 
 *          distribution, or use of this software is strictly prohibited.
 */

/**
 * Check if a DSAi library or file exists in the current Figma document
 * Looks for:
 * 1. Variables with "DSAi" or "DSAI" in the collection name
 * 2. Pages with "DSAi" or "DSAI" in the name
 * 3. Local variable collections containing expected token patterns
 * 
 * @returns Promise<{found: boolean, message: string}>
 */
async function checkForDSAiLibrary(): Promise<{ found: boolean; message: string; details?: string }> {
  try {
    // Check for DSAi variable collections
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    
    // Look for collections with DSAi naming or expected patterns
    const dsaiPatterns = ['dsai', 'foundation', 'spacing', 'radius', 'typography'];
    const foundCollections: string[] = [];
    
    for (const collection of localCollections) {
      const nameLower = collection.name.toLowerCase();
      if (dsaiPatterns.some(pattern => nameLower.includes(pattern))) {
        foundCollections.push(collection.name);
      }
    }
    
    // Check if we found any matching collections
    if (foundCollections.length > 0) {
      return {
        found: true,
        message: 'DSAi library detected',
        details: `Found: ${foundCollections.slice(0, 3).join(', ')}${foundCollections.length > 3 ? '...' : ''}`
      };
    }
    
    // Check for DSAi pages as fallback
    const dsaiPages = figma.root.children.filter(page => {
      const nameLower = page.name.toLowerCase();
      return nameLower.includes('dsai') || nameLower.includes('tokens') || nameLower.includes('foundation');
    });
    
    if (dsaiPages.length > 0) {
      return {
        found: true,
        message: 'DSAi pages detected',
        details: `Found page: ${dsaiPages[0].name}`
      };
    }
    
    // No DSAi library found
    return {
      found: false,
      message: 'Could not find DSAi library file',
      details: 'Please ensure this Figma file has DSAi variables or the DSAi library is enabled.'
    };
  } catch (error) {
    console.error('Error checking for DSAi library:', error);
    return {
      found: false,
      message: 'Error checking for library',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Initialize plugin UI
// Shows a modal window for JSON upload and configuration
figma.showUI(__html__, {
  width: 500,
  height: 680,
  themeColors: true, // Adapts to user's Figma theme (light/dark)
  title: 'DSAi Component Builder'
});

// Check for DSAi library on plugin initialization
checkForDSAiLibrary().then(result => {
  figma.ui.postMessage({
    type: 'library-check',
    found: result.found,
    message: result.message,
    details: result.details
  });
});

/**
 * Message handler for UI interactions
 * 
 * Processes messages sent from the plugin UI (HTML/JS) to the plugin backend.
 * Handles JSON file uploads and component creation requests.
 * 
 * Supported message types:
 * - 'upload-json': Parses JSON string and creates components
 * - 'create-component': Creates components from config object
 * - 'duplicate-action': Handles user's choice when duplicate is detected
 */
figma.ui.onmessage = async (msg: PluginMessage & { type: string; action?: string; existingNodeId?: string }) => {
  console.log('=== PLUGIN MESSAGE RECEIVED ===');
  console.log('Message type:', msg.type);
  console.log('Message data length:', typeof msg.data === 'string' ? msg.data.length : 'not a string');
  
  try {
    if (msg.type === 'upload-json') {
      console.log('Processing upload-json...');
      
      // Parse the uploaded JSON file content
      const jsonString = msg.data as string;
      console.log('JSON string first 100 chars:', jsonString.substring(0, 100));
      
      const config: ComponentConfig = JSON.parse(jsonString);

      // Debug logging for validation
      console.log('Parsed config keys:', Object.keys(config));
      console.log('Has componentSet?', !!config.componentSet);
      console.log('ComponentSet name:', config.componentSet?.name);
      console.log('ComponentSet pageName:', config.componentSet?.pageName);
      console.log('Has defaultStyles?', !!config.defaultStyles);
      console.log('Has variants?', !!config.variants);
      console.log('Variants array length:', config.variants?.length);
      console.log('First variant full object:', JSON.stringify(config.variants?.[0], null, 2));
      console.log('First variant.variant:', config.variants?.[0]?.variant);
      console.log('First variant.state:', config.variants?.[0]?.state);
      console.log('First variant.size:', config.variants?.[0]?.size);

      // Validate JSON structure matches expected schema
      if (!config.componentSet || !config.defaultStyles || !config.variants) {
        figma.notify('❌ Invalid JSON structure. Expected componentSet, defaultStyles, and variants.', {
          error: true
        });
        return;
      }

      // Provide user feedback during processing
      figma.notify('⏳ Creating components from JSON...', {
        timeout: 2000
      });

      // Build components from JSON configuration
      const result = await loadJSONAndCreateComponents(config);

      // Process successful creation
      if (result.success) {
        const message = result.message || `✅ Successfully created ${result.componentsCreated} component(s)!`;
        figma.notify(message, {
          timeout: 3000
        });

        // Plugin remains open for additional operations
        // Uncomment the following line to auto-close after success:
        // figma.closePlugin();
      } else {
        // Handle creation failure
        // Don't show error notification if it's a duplicate detection (modal handles it)
        if (!result.error?.includes('Duplicate component detected')) {
          figma.notify(`❌ Error: ${result.error}`, {
            error: true,
            timeout: 5000
          });
        }
      }
    } else if (msg.type === 'create-component') {
      // Alternative message type for direct config object (not JSON string)
      const config = msg.data as ComponentConfig;
      const result = await loadJSONAndCreateComponents(config);

      if (result.success) {
        figma.notify(`✅ Component created successfully!`);
      } else {
        figma.notify(`❌ ${result.error}`, { error: true });
      }
    } else if (msg.type === 'duplicate-action') {
      // Handle user's choice when duplicate component is detected
      const action = msg.action;
      
      if (action === 'skip') {
        // User chose to skip - do nothing
        figma.ui.postMessage({
          type: 'creation-complete',
          message: 'Component creation cancelled'
        });
      } else if (action === 'replace' && msg.data) {
        // User chose to replace - delete existing and create new at same position
        let replacementPosition: { x: number; y: number } | undefined;
        
        try {
          // Get the existing node by ID, save its position, then delete it
          if (msg.existingNodeId) {
            const nodeToDelete = await figma.getNodeByIdAsync(msg.existingNodeId);
            if (nodeToDelete && 'x' in nodeToDelete && 'y' in nodeToDelete) {
              replacementPosition = { x: nodeToDelete.x, y: nodeToDelete.y };
              console.log(`📍 Saving position of existing component: (${replacementPosition.x}, ${replacementPosition.y})`);
              nodeToDelete.remove();
              console.log('Removed existing component for replacement:', msg.existingNodeId);
            }
          }
        } catch (error) {
          console.error('Error deleting existing component:', error);
        }
        
        const config = msg.data as ComponentConfig;
        const result = await loadJSONAndCreateComponents(config, true, replacementPosition); // Skip duplicate check, pass position
        
        if (result.success) {
          figma.ui.postMessage({
            type: 'creation-complete',
            message: `✅ Successfully replaced component with ${result.componentsCreated} variant(s)!`
          });
        } else {
          figma.ui.postMessage({
            type: 'creation-error',
            message: `❌ Error: ${result.error}`
          });
        }
      } else if (action === 'duplicate' && msg.data) {
        // User chose to create duplicate - create without checking for existing
        const config = msg.data as ComponentConfig;
        // Modify the component name to make it unique
        config.componentSet.name = `${config.componentSet.name} (Copy)`;
        
        const result = await loadJSONAndCreateComponents(config, true); // Skip duplicate check
        
        if (result.success) {
          figma.ui.postMessage({
            type: 'creation-complete',
            message: `✅ Successfully created duplicate with ${result.componentsCreated} variant(s)!`
          });
        } else {
          figma.ui.postMessage({
            type: 'creation-error',
            message: `❌ Error: ${result.error}`
          });
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Plugin error:', error);
    figma.notify(`❌ Error: ${errorMessage}`, {
      error: true,
      timeout: 5000
    });
  }
};

/**
 * Plugin cleanup handler
 * Called when the plugin is closed by the user
 */
figma.on('close', () => {
  console.log('DSAi Component Builder closed');
  console.log('© 2025 All rights reserved.');
});
