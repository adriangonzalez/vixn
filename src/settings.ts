import {
	App,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
} from 'obsidian';
import VixnPlugin from './main';

export interface VixnSettings {
	enabled: boolean;
	hJumpsToParent: boolean;
	fileOps: boolean;
}

export const DEFAULT_SETTINGS: VixnSettings = {
	enabled: true,
	hJumpsToParent: true,
	fileOps: true,
};

const SETTING_TEXTS = {
	enabled: {
		name: 'Vim navigation',
		desc: 'Handle vim navigation keys when the file explorer has keyboard focus.',
	},
	fileOps: {
		name: 'File operations',
		desc: 'Enable creating (a), renaming (r), and deleting (d) from the file explorer. When off, those keys pass through untouched.',
	},
	hJumpsToParent: {
		name: 'Move to parent folder with h',
		desc: 'When the selection is a file or a collapsed folder, h jumps to its parent folder. When off, h only collapses the current folder.',
	},
} as const;

const SETTING_KEYS = Object.keys(SETTING_TEXTS) as (keyof VixnSettings)[];

export class VixnSettingTab extends PluginSettingTab {
	plugin: VixnPlugin;

	constructor(app: App, plugin: VixnPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Declarative settings (Obsidian 1.13+); enables settings search. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return SETTING_KEYS.map((key) => ({
			name: SETTING_TEXTS[key].name,
			desc: SETTING_TEXTS[key].desc,
			control: {
				type: 'toggle',
				key,
				defaultValue: DEFAULT_SETTINGS[key],
			},
		}));
	}

	/** Imperative fallback for Obsidian versions older than 1.13.0. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		for (const key of SETTING_KEYS) {
			new Setting(containerEl)
				.setName(SETTING_TEXTS[key].name)
				.setDesc(SETTING_TEXTS[key].desc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings[key])
						.onChange(async (value) => {
							this.plugin.settings[key] = value;
							await this.plugin.saveSettings();
						}),
				);
		}
	}
}
