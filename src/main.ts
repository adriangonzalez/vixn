import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, VixnSettings, VixnSettingTab } from './settings';
import { KeySequencer } from './keymap';
import { runAction } from './actions';
import {
	ensureTreeFocus,
	focusExplorer,
	getTreeContainer,
	isExplorerTreeEvent,
	isTreeClick,
} from './explorer';

export default class VixnPlugin extends Plugin {
	settings!: VixnSettings;
	private keys = new KeySequencer();

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new VixnSettingTab(this.app, this));

		this.addCommand({
			id: 'focus-file-explorer',
			name: 'Focus file explorer',
			callback: () => void focusExplorer(this.app),
		});

		// Capture phase so mapped keys are handled before the tree or any
		// global hotkey sees them.
		this.registerDomEvent(
			document,
			'keydown',
			(evt: KeyboardEvent) => this.onKeydown(evt),
			{ capture: true },
		);
		this.register(() => this.keys.reset());

		// Clicking the tree must also grab DOM focus for it: macOS happens
		// to focus the container on click, but Windows/Linux do not, and
		// the key listener only engages while focus is inside the tree.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			if (!this.settings.enabled || !isTreeClick(evt)) return;
			window.setTimeout(() => ensureTreeFocus(this.app), 0);
		});
	}

	private onKeydown(evt: KeyboardEvent): void {
		// Ignore our own synthetic events (isTrusted is false) to avoid loops.
		if (!this.settings.enabled || !evt.isTrusted) return;
		if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
		if (!isExplorerTreeEvent(evt)) {
			this.keys.reset();
			return;
		}

		const action = this.keys.resolve(evt.key);
		if (action === null) return;
		evt.preventDefault();
		evt.stopPropagation();
		if (action === 'pending' || !evt.target) return;

		// Dispatch at the tree container itself: the event target can be a
		// stale item element after the tree re-renders.
		const target = getTreeContainer(this.app) ?? evt.target;
		const keepTreeFocus = runAction(this.app, this.settings, action, target);
		if (keepTreeFocus) {
			// Deferred so it runs after any focus shift or re-render caused
			// by the native handling of the action.
			window.setTimeout(() => ensureTreeFocus(this.app), 0);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<VixnSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
