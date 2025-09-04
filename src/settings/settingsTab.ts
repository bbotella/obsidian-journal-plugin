import { App, PluginSettingTab, Setting, DropdownComponent, TextAreaComponent, TFolder, FuzzySuggestModal, TextComponent, FuzzyMatch } from 'obsidian';
import JournalPlugin from '../main';
import { AIServiceFactory } from '../services/ai/aiServiceFactory';
import { AIProvider } from '../models/types';
import { logger } from '../utils/logger';

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  private onSelect: (folder: TFolder) => void;

  constructor(app: App, onSelect: (folder: TFolder) => void) {
    super(app);
    this.onSelect = onSelect;
    this.setPlaceholder('Type to search folders...');
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    
    const addFolder = (folder: TFolder) => {
      folders.push(folder);
      folder.children.forEach(child => {
        if (child instanceof TFolder) {
          addFolder(child);
        }
      });
    };

    // Get root folder
    const rootFolder = this.app.vault.getRoot();
    rootFolder.children.forEach(child => {
      if (child instanceof TFolder) {
        addFolder(child);
      }
    });

    // Sort folders alphabetically
    folders.sort((a, b) => a.path.localeCompare(b.path));

    return folders;
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  renderSuggestion(value: FuzzyMatch<TFolder>, el: HTMLElement): void {
    const folder = value.item;
    el.createEl('div', { text: folder.name, cls: 'suggestion-title' });
    
    if (folder.path !== folder.name) {
      el.createEl('small', { 
        text: folder.path, 
        cls: 'suggestion-note' 
      });
    }
    
    // Add file count info
    const fileCount = folder.children.filter(child => child.name.endsWith('.md')).length;
    const folderCount = folder.children.filter(child => child instanceof TFolder).length;
    
    if (fileCount > 0 || folderCount > 0) {
      const countText = [];
      if (fileCount > 0) countText.push(`${fileCount} files`);
      if (folderCount > 0) countText.push(`${folderCount} folders`);
      
      el.createEl('small', { 
        text: countText.join(', '), 
        cls: 'suggestion-aux' 
      });
    }
  }

  onChooseItem(folder: TFolder): void {
    this.onSelect(folder);
  }
}

class FolderSuggest {
  private app: App;
  private textComponent: TextComponent;
  private onSelect: (value: string) => void;

  constructor(app: App, textComponent: TextComponent, onSelect: (value: string) => void) {
    this.app = app;
    this.textComponent = textComponent;
    this.onSelect = onSelect;
    this.setupSuggestion();
  }

  private setupSuggestion(): void {
    // Add a button container next to the input
    const containerEl = this.textComponent.inputEl.parentElement;
    if (containerEl) {
      // Create a wrapper for better styling
      const buttonContainer = containerEl.createEl('div', {
        cls: 'setting-item-control-button-container'
      });
      buttonContainer.style.display = 'inline-flex';
      buttonContainer.style.alignItems = 'center';
      buttonContainer.style.marginLeft = '8px';

      const button = buttonContainer.createEl('button', {
        text: '📁',
        title: 'Browse folders (Click to select from existing folders)',
        cls: 'clickable-icon setting-folder-suggest-button'
      });
      
      // Better button styling
      button.style.padding = '6px 10px';
      button.style.border = '1px solid var(--background-modifier-border)';
      button.style.borderRadius = '6px';
      button.style.background = 'var(--interactive-normal)';
      button.style.color = 'var(--text-normal)';
      button.style.cursor = 'pointer';
      button.style.fontSize = '14px';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.minWidth = '32px';
      button.style.height = '32px';

      button.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = new FolderSuggestModal(this.app, (folder) => {
          this.textComponent.setValue(folder.path);
          this.onSelect(folder.path);
          this.validateFolder(folder.path);
        });
        modal.open();
      });

      // Add hover effects
      button.addEventListener('mouseenter', () => {
        button.style.background = 'var(--interactive-hover)';
        button.style.borderColor = 'var(--interactive-accent)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = 'var(--interactive-normal)';
        button.style.borderColor = 'var(--background-modifier-border)';
      });

      // Add validation on input change
      this.textComponent.inputEl.addEventListener('input', () => {
        setTimeout(() => this.validateFolder(this.textComponent.getValue()), 100);
      });

      // Initial validation
      setTimeout(() => this.validateFolder(this.textComponent.getValue()), 100);
    }

    // Add better placeholder and tooltip
    this.textComponent.inputEl.placeholder = 'e.g., Daily Notes';
    this.textComponent.inputEl.title = 'Enter folder path manually or click 📁 to browse existing folders';
  }

  private validateFolder(path: string): void {
    if (!path.trim()) return;

    const folder = this.app.vault.getAbstractFileByPath(path);
    const inputEl = this.textComponent.inputEl;
    
    // Remove existing validation classes
    inputEl.classList.remove('folder-valid', 'folder-invalid');
    
    // Remove existing validation message
    const existingMsg = inputEl.parentElement?.querySelector('.folder-validation-msg');
    if (existingMsg) {
      existingMsg.remove();
    }

    if (folder instanceof TFolder) {
      // Folder exists
      inputEl.classList.add('folder-valid');
      inputEl.style.borderColor = 'var(--color-green)';
      
      // Show file count
      const fileCount = folder.children.filter(child => child.name.endsWith('.md')).length;
      if (fileCount > 0) {
        const msg = inputEl.parentElement?.createEl('small', {
          text: `✅ Found ${fileCount} markdown files`,
          cls: 'folder-validation-msg'
        });
        if (msg) {
          msg.style.color = 'var(--color-green)';
          msg.style.display = 'block';
          msg.style.marginTop = '4px';
          msg.style.fontSize = '12px';
        }
      }
    } else {
      // Folder doesn't exist
      inputEl.classList.add('folder-invalid');
      inputEl.style.borderColor = 'var(--color-orange)';
      
      const msg = inputEl.parentElement?.createEl('small', {
        text: `⚠️ Folder doesn't exist yet (will be created)`,
        cls: 'folder-validation-msg'
      });
      if (msg) {
        msg.style.color = 'var(--color-orange)';
        msg.style.display = 'block';
        msg.style.marginTop = '4px';
        msg.style.fontSize = '12px';
      }
    }
  }
}

export class JournalPluginSettingTab extends PluginSettingTab {
  plugin: JournalPlugin;
  private aiConfigContainer: HTMLElement;
  private modelCache: Map<AIProvider, string[]> = new Map();
  private lastCacheTime: Map<AIProvider, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(app: App, plugin: JournalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Daily Notes to Journal - Settings' });

    this.addBasicSettings();
    this.addAISettings();
    this.addSchedulingSettings();
    this.addAdvancedSettings();
    this.addActionButtons();
    this.addSupportSection();
  }

  private addBasicSettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Basic Settings' });

    // Source folder
    new Setting(containerEl)
      .setName('Source folder')
      .setDesc('Folder containing your daily notes')
      .addText(text => {
        text
          .setPlaceholder('Daily Notes')
          .setValue(this.plugin.settings.sourceFolder)
          .onChange(async (value) => {
            this.plugin.settings.sourceFolder = value.trim() || 'Daily Notes';
            await this.plugin.saveSettings();
          });
        
        // Add folder suggestion
        new FolderSuggest(this.app, text, async (value) => {
          this.plugin.settings.sourceFolder = value || 'Daily Notes';
          await this.plugin.saveSettings();
        });
      });

    // Date format
    new Setting(containerEl)
      .setName('Date format')
      .setDesc('Date format used in daily note filenames (e.g., YYYY-MM-DD)')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD')
        .setValue(this.plugin.settings.dateFormat)
        .onChange(async (value) => {
          this.plugin.settings.dateFormat = value.trim() || 'YYYY-MM-DD';
          await this.plugin.saveSettings();
        }));

    // Destination folder
    new Setting(containerEl)
      .setName('Journal folder')
      .setDesc('Folder where journal entries will be created')
      .addText(text => {
        text
          .setPlaceholder('Journal')
          .setValue(this.plugin.settings.destinationFolder)
          .onChange(async (value) => {
            this.plugin.settings.destinationFolder = value.trim() || 'Journal';
            await this.plugin.saveSettings();
          });
        
        // Add folder suggestion
        new FolderSuggest(this.app, text, async (value) => {
          this.plugin.settings.destinationFolder = value || 'Journal';
          await this.plugin.saveSettings();
        });
      });

    // Journal filename format
    new Setting(containerEl)
      .setName('Journal filename format')
      .setDesc('Format for journal entry filenames (supports date formatting)')
      .addText(text => text
        .setPlaceholder('Journal-YYYY-MM-DD.md')
        .setValue(this.plugin.settings.journalFileNameFormat)
        .onChange(async (value) => {
          this.plugin.settings.journalFileNameFormat = value.trim() || 'Journal-YYYY-MM-DD.md';
          await this.plugin.saveSettings();
        }));

    // Output language
    new Setting(containerEl)
      .setName('Output language')
      .setDesc('Language for journal entries (auto = detect from source)')
      .addDropdown(dropdown => dropdown
        .addOption('auto', 'Auto-detect')
        .addOption('en', 'English')
        .addOption('es', 'Spanish')
        .addOption('fr', 'French')
        .addOption('de', 'German')
        .addOption('it', 'Italian')
        .addOption('pt', 'Portuguese')
        .addOption('ru', 'Russian')
        .addOption('ja', 'Japanese')
        .addOption('ko', 'Korean')
        .addOption('zh', 'Chinese')
        .setValue(this.plugin.settings.outputLanguage)
        .onChange(async (value) => {
          this.plugin.settings.outputLanguage = value;
          await this.plugin.saveSettings();
        }));
  }

  private addAISettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'AI Configuration' });

    let providerDropdown: DropdownComponent;
    let modelDropdown: DropdownComponent;
    let modelRefreshButton: HTMLButtonElement;

    // AI Provider
    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Choose your AI service provider')
      .addDropdown(dropdown => {
        providerDropdown = dropdown;
        dropdown
          .addOption('openai', 'OpenAI')
          .addOption('gemini', 'Google Gemini')
          .addOption('ollama', 'Ollama (Local)')
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (value: AIProvider) => {
            this.plugin.settings.aiProvider = value;
            
            // Clear cache when provider changes
            this.modelCache.clear();
            this.lastCacheTime.clear();
            
            // Reset config when provider changes
            const fallbackModels = AIServiceFactory.getFallbackModels(value);
            this.plugin.settings.aiConfig.model = fallbackModels[0] || '';
            this.plugin.settings.aiConfig.apiKey = '';
            this.plugin.settings.aiConfig.endpoint = value === 'ollama' ? 'http://localhost:11434' : '';
            
            await this.plugin.saveSettings();
            
            // Refresh model dropdown with static models first
            this.updateModelDropdown(modelDropdown, value, fallbackModels);
            this.refreshAIConfigSettings();
            
            // Then try to fetch dynamic models
            this.fetchAndUpdateModels(value, modelDropdown, modelRefreshButton);
          });
      });

    // Model selection with refresh button
    const modelSetting = new Setting(containerEl)
      .setName('Model')
      .setDesc('AI model to use for processing');

    modelSetting.addDropdown(dropdown => {
      modelDropdown = dropdown;
      
      // First check if we have cached models for this provider
      const cachedModels = this.modelCache.get(this.plugin.settings.aiProvider);
      let modelsToUse = cachedModels;
      
      if (!modelsToUse) {
        // If no cached models, use fallback models temporarily
        modelsToUse = AIServiceFactory.getFallbackModels(this.plugin.settings.aiProvider);
      }
      
      // Only update dropdown options, don't auto-select anything yet
      this.updateModelDropdown(dropdown, this.plugin.settings.aiProvider, modelsToUse, false);
      
      // Set the current model if it exists in the available models
      const currentModel = this.plugin.settings.aiConfig.model;
      if (currentModel && modelsToUse.includes(currentModel)) {
        dropdown.setValue(currentModel);
      }
      
      dropdown.onChange(async (value) => {
        this.plugin.settings.aiConfig.model = value;
        await this.plugin.saveSettings();
      });
    });

    // Add refresh button for models
    modelSetting.addButton(button => {
      modelRefreshButton = button.buttonEl;
      button
        .setButtonText('🔄')
        .setTooltip('Refresh available models from endpoint')
        .onClick(async () => {
          await this.refreshModels(modelDropdown, modelRefreshButton);
        });
      
      // Style the refresh button
      button.buttonEl.style.marginLeft = '8px';
      button.buttonEl.style.padding = '6px 10px';
      button.buttonEl.style.borderRadius = '6px';
      button.buttonEl.style.fontSize = '14px';
    });

    // Dynamic AI config settings
    this.aiConfigContainer = containerEl.createDiv();
    this.refreshAIConfigSettings();

    // Initial model fetch for current provider - only if no API key/endpoint configured yet
    setTimeout(() => {
      const requirements = AIServiceFactory.getProviderRequirements(this.plugin.settings.aiProvider);
      const hasRequiredConfig = (!requirements.requiresApiKey || this.plugin.settings.aiConfig.apiKey) &&
                               (!requirements.requiresEndpoint || this.plugin.settings.aiConfig.endpoint);
      
      if (hasRequiredConfig) {
        this.fetchAndUpdateModels(this.plugin.settings.aiProvider, modelDropdown, modelRefreshButton);
      }
    }, 100);
  }

  private updateModelDropdown(dropdown: DropdownComponent, provider: AIProvider, models?: string[], preserveSelection: boolean = true): void {
    // Remember the current selection
    const currentSelection = this.plugin.settings.aiConfig.model;
    
    // Clear existing options
    dropdown.selectEl.empty();
    
    const modelList = models || AIServiceFactory.getFallbackModels(provider);
    
    if (modelList.length === 0) {
      dropdown.addOption('', 'No models available');
      return;
    }
    
    modelList.forEach(model => {
      dropdown.addOption(model, model);
    });
    
    if (preserveSelection) {
      // Restore the selection if it's still available in the new model list
      if (currentSelection && modelList.includes(currentSelection)) {
        dropdown.setValue(currentSelection);
      } else if (modelList.length > 0) {
        // If the current selection is not available, use the first model and update settings
        dropdown.setValue(modelList[0]);
        this.plugin.settings.aiConfig.model = modelList[0];
        this.plugin.saveSettings();
      }
    }
    // If preserveSelection is false, don't set any value - let the caller handle it
  }

  /**
   * Fetch and update models for a specific provider with caching
   */
  private async fetchAndUpdateModels(
    provider: AIProvider, 
    dropdown: DropdownComponent, 
    refreshButton: HTMLButtonElement
  ): Promise<void> {
    // Check cache first
    const now = Date.now();
    const lastCache = this.lastCacheTime.get(provider);
    const cachedModels = this.modelCache.get(provider);
    
    if (cachedModels && lastCache && (now - lastCache) < this.CACHE_DURATION) {
      // Use cached models and preserve selection
      const currentSelection = this.plugin.settings.aiConfig.model;
      
      this.updateModelDropdown(dropdown, provider, cachedModels, false);
      
      // Restore selection if it was in the cached list
      if (currentSelection && cachedModels.includes(currentSelection)) {
        dropdown.setValue(currentSelection);
      } else if (cachedModels.length > 0) {
        // If current selection is not in cached models, it may have been removed
        // Only change if we're confident the current selection is invalid
        // Don't auto-change - let user decide
      }
      return;
    }

    // Don't fetch models if no API key/endpoint is configured
    const requirements = AIServiceFactory.getProviderRequirements(provider);
    if (requirements.requiresApiKey && !this.plugin.settings.aiConfig.apiKey) {
      return;
    }
    if (requirements.requiresEndpoint && !this.plugin.settings.aiConfig.endpoint) {
      return;
    }

    try {
      const result = await AIServiceFactory.fetchAvailableModels(provider, this.plugin.settings.aiConfig);
      
      if (result.success && result.models.length > 0) {
        // Cache the models
        this.modelCache.set(provider, result.models);
        this.lastCacheTime.set(provider, now);
        
        // Preserve the current selection
        const currentSelection = this.plugin.settings.aiConfig.model;
        
        // Update dropdown without auto-selecting, let us handle selection manually
        this.updateModelDropdown(dropdown, provider, result.models, false);
        
        // Now handle selection preservation manually
        if (currentSelection && result.models.includes(currentSelection)) {
          dropdown.setValue(currentSelection);
        } else if (result.models.length > 0) {
          // Only change if the current selection is invalid
          this.plugin.settings.aiConfig.model = result.models[0];
          dropdown.setValue(result.models[0]);
          await this.plugin.saveSettings();
        }
        
        // Show success indicator
        this.showModelRefreshStatus(refreshButton, true, `Found ${result.models.length} models`);
      } else {
        // Show warning if no models found or failed
        const message = result.error || 'No models available';
        this.showModelRefreshStatus(refreshButton, false, message);
      }
    } catch (error) {
      logger.error('Error fetching models:', error);
      this.showModelRefreshStatus(refreshButton, false, 'Failed to fetch models');
    }
  }

  /**
   * Refresh models button handler
   */
  private async refreshModels(dropdown: DropdownComponent, refreshButton: HTMLButtonElement): Promise<void> {
    refreshButton.textContent = '⏳';
    refreshButton.disabled = true;
    
    try {
      // Clear cache to force fresh fetch
      this.modelCache.delete(this.plugin.settings.aiProvider);
      this.lastCacheTime.delete(this.plugin.settings.aiProvider);
      
      await this.fetchAndUpdateModels(this.plugin.settings.aiProvider, dropdown, refreshButton);
    } finally {
      refreshButton.textContent = '🔄';
      refreshButton.disabled = false;
    }
  }

  /**
   * Show model refresh status with temporary visual feedback
   */
  private showModelRefreshStatus(button: HTMLButtonElement, success: boolean, message: string): void {
    const originalText = button.textContent;
    const originalColor = button.style.color;
    
    button.textContent = success ? '✅' : '❌';
    button.style.color = success ? 'var(--color-green)' : 'var(--color-red)';
    button.title = message;
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.color = originalColor;
      button.title = 'Refresh available models from endpoint';
    }, 2000);
  }

  private refreshAIConfigSettings(): void {
    this.aiConfigContainer.empty();

    const provider = this.plugin.settings.aiProvider;
    const requirements = AIServiceFactory.getProviderRequirements(provider);

    // Show provider description
    this.aiConfigContainer.createEl('p', { 
      text: requirements.description,
      cls: 'setting-item-description'
    });

    // API Key (if required)
    if (requirements.requiresApiKey) {
      new Setting(this.aiConfigContainer)
        .setName('API Key')
        .setDesc('Your API key for the selected provider')
        .addText(text => text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.aiConfig.apiKey || '')
          .onChange(async (value) => {
            this.plugin.settings.aiConfig.apiKey = value.trim();
            await this.plugin.saveSettings();
            
            // Clear cache when API key changes
            this.modelCache.delete(this.plugin.settings.aiProvider);
            this.lastCacheTime.delete(this.plugin.settings.aiProvider);
            
            // Trigger model refresh when API key is updated
            this.triggerModelRefresh();
          }));
    }

    // Endpoint (if required)
    if (requirements.requiresEndpoint) {
      new Setting(this.aiConfigContainer)
        .setName('Endpoint URL')
        .setDesc('URL of your Ollama server')
        .addText(text => text
          .setPlaceholder('http://localhost:11434')
          .setValue(this.plugin.settings.aiConfig.endpoint || 'http://localhost:11434')
          .onChange(async (value) => {
            this.plugin.settings.aiConfig.endpoint = value.trim() || 'http://localhost:11434';
            await this.plugin.saveSettings();
            
            // Clear cache when endpoint changes
            this.modelCache.delete(this.plugin.settings.aiProvider);
            this.lastCacheTime.delete(this.plugin.settings.aiProvider);
            
            // Trigger model refresh when endpoint is updated
            this.triggerModelRefresh();
          }));
    }
  }

  /**
   * Trigger model refresh after configuration changes
   */
  private triggerModelRefresh(): void {
    // Find the model dropdown and refresh button from the DOM
    const modelDropdowns = this.containerEl.querySelectorAll('.dropdown');
    const refreshButtons = this.containerEl.querySelectorAll('button[title*="Refresh"]');
    
    if (modelDropdowns.length >= 2 && refreshButtons.length > 0) {
      const modelDropdown = (modelDropdowns[1] as any)?.__component;
      const refreshButton = refreshButtons[0] as HTMLButtonElement;
      
      if (modelDropdown && refreshButton) {
        // Delay to allow settings to be saved
        setTimeout(() => {
          this.fetchAndUpdateModels(this.plugin.settings.aiProvider, modelDropdown, refreshButton);
        }, 500);
      }
    }
  }

  private addSchedulingSettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Scheduling' });

    let sliderComponent: any;
    let textComponent: any;

    // Check frequency
    new Setting(containerEl)
      .setName('Check frequency')
      .setDesc('How often to check for new daily notes (in minutes)')
      .addSlider(slider => {
        sliderComponent = slider;
        slider
          .setLimits(5, 1440, 5) // 5 minutes to 24 hours
          .setValue(this.plugin.settings.checkFrequency)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.checkFrequency = value;
            try {
              await this.plugin.saveSettings();
            } catch (error) {
              console.error('Slider save failed:', error);
            }
            // Update the text input to stay in sync
            if (textComponent) {
              textComponent.setValue(value.toString());
            }
          });
        return slider;
      })
      .addText(text => {
        textComponent = text;
        text
          .setValue(this.plugin.settings.checkFrequency.toString())
          .onChange(async (value) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 5 && numValue <= 1440) {
              this.plugin.settings.checkFrequency = numValue;
              try {
                await this.plugin.saveSettings();
              } catch (error) {
                console.error('Text save failed:', error);
              }
              // Update the slider to stay in sync
              if (sliderComponent) {
                sliderComponent.setValue(numValue);
              }
            }
          });
        return text;
      });
  }

  private addAdvancedSettings(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Advanced Settings' });

    // Custom prompt
    new Setting(containerEl)
      .setName('Custom prompt')
      .setDesc('Custom prompt for AI processing. Use {content} placeholder for log entries.')
      .addTextArea(text => {
        text
          .setPlaceholder('Enter your custom prompt...')
          .setValue(this.plugin.settings.customPrompt)
          .onChange(async (value) => {
            this.plugin.settings.customPrompt = value;
            await this.plugin.saveSettings();
          });
        
        // Set text area size
        text.inputEl.rows = 8;
        text.inputEl.style.width = '100%';
        text.inputEl.style.minHeight = '150px';
      });

    // Information about dynamic processing
    new Setting(containerEl)
      .setName('Dynamic processing')
      .setDesc('Notes are processed dynamically based on journal file existence. To reprocess a note, delete its corresponding journal file.')
      .addButton(button => button
        .setButtonText('Info')
        .setDisabled(true)
        .onClick(() => {
          // This is just an informational setting
        }));
  }

  private addActionButtons(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Actions' });

    // Test AI connection
    new Setting(containerEl)
      .setName('Test AI connection')
      .setDesc('Test if your AI configuration is working')
      .addButton(button => button
        .setButtonText('Test Connection')
        .onClick(async () => {
          button.setButtonText('Testing...');
          button.setDisabled(true);
          
          try {
            const result = await this.plugin.scheduler.testAIConnection();
            
            const statusEl = containerEl.createEl('div', {
              text: result.success ? '✅ Connection successful!' : `❌ Connection failed: ${result.error}`,
              cls: result.success ? 'mod-success' : 'mod-error'
            });
            
            setTimeout(() => statusEl.remove(), 5000);
          } catch (error) {
            const statusEl = containerEl.createEl('div', {
              text: `❌ Test failed: ${error.message}`,
              cls: 'mod-error'
            });
            setTimeout(() => statusEl.remove(), 5000);
          } finally {
            button.setButtonText('Test Connection');
            button.setDisabled(false);
          }
        }));

    // Manual processing trigger
    new Setting(containerEl)
      .setName('Process notes now')
      .setDesc('Manually trigger processing of daily notes')
      .addButton(button => button
        .setButtonText('Process Now')
        .onClick(async () => {
          button.setButtonText('Processing...');
          button.setDisabled(true);
          
          try {
            const result = await this.plugin.scheduler.processNotes();
            
            const statusEl = containerEl.createEl('div', {
              text: `✅ Processed ${result.processed} notes in ${(result.duration / 1000).toFixed(1)}s`,
              cls: 'mod-success'
            });
            
            if (result.errors.length > 0) {
              statusEl.innerHTML += `<br>⚠️ ${result.errors.length} errors occurred`;
              statusEl.className = 'mod-warning';
            }
            
            setTimeout(() => statusEl.remove(), 5000);
          } catch (error) {
            const statusEl = containerEl.createEl('div', {
              text: `❌ Processing failed: ${error.message}`,
              cls: 'mod-error'
            });
            setTimeout(() => statusEl.remove(), 5000);
          } finally {
            button.setButtonText('Process Now');
            button.setDisabled(false);
          }
        }));

    // Validation
    new Setting(containerEl)
      .setName('Validate configuration')
      .setDesc('Check if all settings are correct')
      .addButton(button => button
        .setButtonText('Validate')
        .onClick(async () => {
          const validation = await this.plugin.scheduler.validateConfiguration();
          
          let message = '';
          let className = '';
          
          if (validation.valid) {
            message = '✅ Configuration is valid!';
            className = 'mod-success';
          } else {
            message = `❌ Configuration errors:\n${validation.errors.join('\n')}`;
            className = 'mod-error';
          }
          
          if (validation.warnings.length > 0) {
            message += `\n⚠️ Warnings:\n${validation.warnings.join('\n')}`;
            if (className === 'mod-success') className = 'mod-warning';
          }
          
          const statusEl = containerEl.createEl('pre', {
            text: message,
            cls: className
          });
          statusEl.style.whiteSpace = 'pre-wrap';
          statusEl.style.fontSize = '12px';
          
          setTimeout(() => statusEl.remove(), 10000);
        }));
  }

  private addSupportSection(): void {
    const { containerEl } = this;

    containerEl.createEl('h3', { text: 'Support' });

    // Support information with funding link
    const supportDesc = containerEl.createEl('div', { 
      cls: 'setting-item-description' 
    });
    
    supportDesc.innerHTML = `
      <p>If you find this plugin helpful, consider supporting its development:</p>
      <p style="margin-top: 10px;">
        <a href="https://buymeacoffee.com/contactonu" 
           target="_blank" 
           rel="noopener noreferrer"
           style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #FFDD00; color: #000; text-decoration: none; border-radius: 5px; font-weight: 500;">
          <span>☕</span> Buy me a coffee
        </a>
      </p>
      <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
        Your support helps maintain and improve this plugin. Thank you! 🙏
      </p>
    `;

    // Add some spacing
    supportDesc.style.marginBottom = '20px';
  }
}