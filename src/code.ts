import { ComponentConfig, PluginMessage } from './types';
import { loadJSONAndCreateComponents } from './componentBuilder';

/**
 * Main plugin entry point
 * Opens UI and handles messages from the UI
 */

// Show the plugin UI
figma.showUI(__html__, {
  width: 500,
  height: 600,
  themeColors: true,
  title: 'JSON to Component Builder'
});

// Handle messages from the UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  console.log('=== PLUGIN MESSAGE RECEIVED ===');
  console.log('Message type:', msg.type);
  console.log('Message data length:', typeof msg.data === 'string' ? msg.data.length : 'not a string');
  
  try {
    if (msg.type === 'upload-json') {
      console.log('Processing upload-json...');
      
      // Parse the uploaded JSON file
      const jsonString = msg.data as string;
      console.log('JSON string first 100 chars:', jsonString.substring(0, 100));
      
      const config: ComponentConfig = JSON.parse(jsonString);

      // Debug logging
      console.log('Parsed config keys:', Object.keys(config));
      console.log('Has componentSet?', !!config.componentSet);
      console.log('Has defaultStyles?', !!config.defaultStyles);
      console.log('Has variants?', !!config.variants);

      // Validate the JSON structure (new format)
      if (!config.componentSet || !config.defaultStyles || !config.variants) {
        figma.notify('❌ Invalid JSON structure. Expected componentSet, defaultStyles, and variants.', {
          error: true
        });
        return;
      }

      // Show loading state
      figma.notify('⏳ Creating components from JSON...', {
        timeout: 2000
      });

      // Build components from JSON configuration
      const result = await loadJSONAndCreateComponents(config);

      if (result.success) {
        const message = result.message || `✅ Successfully created ${result.componentsCreated} component(s)!`;
        figma.notify(message, {
          timeout: 3000
        });

        // Optional: Close the plugin after success
        // figma.closePlugin();
      } else {
        figma.notify(`❌ Error: ${result.error}`, {
          error: true,
          timeout: 5000
        });
      }
    } else if (msg.type === 'create-component') {
      const config = msg.data as ComponentConfig;
      const result = await loadJSONAndCreateComponents(config);

      if (result.success) {
        figma.notify(`✅ Component created successfully!`);
      } else {
        figma.notify(`❌ ${result.error}`, { error: true });
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

// Handle plugin close
figma.on('close', () => {
  console.log('Plugin closed');
});
