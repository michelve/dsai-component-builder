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

// Initialize plugin UI
// Shows a modal window for JSON upload and configuration
figma.showUI(__html__, {
  width: 500,
  height: 680,
  themeColors: true, // Adapts to user's Figma theme (light/dark)
  title: 'DSAi Component Builder'
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
        // User chose to replace - delete existing and create new
        try {
          // Get the existing node by ID and delete it
          if (msg.existingNodeId) {
            const nodeToDelete = await figma.getNodeByIdAsync(msg.existingNodeId);
            if (nodeToDelete) {
              nodeToDelete.remove();
              console.log('Removed existing component for replacement:', msg.existingNodeId);
            }
          }
        } catch (error) {
          console.error('Error deleting existing component:', error);
        }
        
        const config = msg.data as ComponentConfig;
        const result = await loadJSONAndCreateComponents(config, true); // Skip duplicate check
        
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
