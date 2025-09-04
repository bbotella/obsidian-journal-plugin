#!/bin/bash

# Plugin Installation Script for Daily Notes to Journal
echo "🔧 Installing Daily Notes to Journal Plugin..."

# Get the vault path from user
echo "Please enter your Obsidian vault path (the folder containing your .obsidian directory):"
read -r VAULT_PATH

# Validate vault path
if [ ! -d "$VAULT_PATH/.obsidian" ]; then
    echo "❌ Error: .obsidian directory not found in $VAULT_PATH"
    echo "Please make sure you entered the correct vault path."
    exit 1
fi

# Create plugins directory if it doesn't exist
PLUGINS_DIR="$VAULT_PATH/.obsidian/plugins"
mkdir -p "$PLUGINS_DIR"

# Create plugin directory
PLUGIN_DIR="$PLUGINS_DIR/obsidian-journal-plugin"
mkdir -p "$PLUGIN_DIR"

# Copy plugin files
echo "📁 Copying plugin files..."
cp main.js "$PLUGIN_DIR/"
cp manifest.json "$PLUGIN_DIR/"
cp versions.json "$PLUGIN_DIR/"

# Verify installation
if [ -f "$PLUGIN_DIR/main.js" ] && [ -f "$PLUGIN_DIR/manifest.json" ]; then
    echo "✅ Plugin installed successfully!"
    echo "📍 Location: $PLUGIN_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Restart Obsidian or reload plugins (Ctrl/Cmd + R)"
    echo "2. Go to Settings > Community Plugins"
    echo "3. Enable 'Daily Notes to Journal'"
    echo "4. Configure the plugin in Settings > Plugin Options"
else
    echo "❌ Installation failed. Please check file permissions."
fi