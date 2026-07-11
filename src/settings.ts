import { App, PluginSettingTab, Setting } from 'obsidian';
import VixnPlugin from './main';

export interface VixnSettings {
	enabled: boolean;
	hJumpsToParent: boolean;
}

export const DEFAULT_SETTINGS: VixnSettings = {
	enabled: true,
	hJumpsToParent: true,
};

export class VixnSettingTab extends PluginSettingTab {
	plugin: VixnPlugin;

	constructor(app: App, plugin: VixnPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Vim navigation')
			.setDesc(
				'Handle vim navigation keys when the file explorer has keyboard focus.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Move to parent folder with h')
			.setDesc(
				'When the selection is a file or a collapsed folder, h jumps to its parent folder. When off, h only collapses the current folder.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hJumpsToParent)
					.onChange(async (value) => {
						this.plugin.settings.hJumpsToParent = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
