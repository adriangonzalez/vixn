import { App, Scope } from 'obsidian';
import { ExplorerItem } from './types';
import {
	ensureTreeFocus,
	focusItem,
	getExplorerView,
	getFocusedItem,
	getVisibleItems,
} from './explorer';

/**
 * The / find bar: a small input docked under the file tree. Typing moves
 * the tree's focused item to the next visible match; Enter keeps it,
 * Escape restores the item focused before the search. n/N repeat the
 * last query after the bar is closed.
 */
export class FindBar {
	private app: App;
	private barEl: HTMLElement | null = null;
	private inputEl: HTMLInputElement | null = null;
	private restoreItem: ExplorerItem | null = null;
	private scope: Scope | null = null;
	private lastQuery = '';

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		if (this.inputEl) {
			this.inputEl.focus();
			return;
		}
		const view = getExplorerView(this.app);
		if (!view) return;
		this.restoreItem = getFocusedItem(this.app);

		// While the bar is open the explorer pane's keymap scope must not
		// see keystrokes — its Enter binding starts a rename (macOS) and
		// Space opens the focused item. Pushing our own scope (parented to
		// the global one, so app hotkeys keep working) suspends it, the
		// same way Obsidian's inline rename does.
		this.scope = new Scope(this.app.scope);
		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			this.close(false);
		});
		this.scope.register([], 'Escape', (evt) => {
			evt.preventDefault();
			this.close(true);
		});
		this.app.keymap.pushScope(this.scope);

		this.barEl = view.containerEl.createDiv({ cls: 'vixn-find' });
		this.inputEl = this.barEl.createEl('input', {
			type: 'text',
			placeholder: 'Find in files list…',
		});
		this.inputEl.addEventListener('input', () => this.onInput());
		this.inputEl.addEventListener('blur', () => this.close(false));
		this.inputEl.focus();
	}

	/** Close the bar; restore = put focus back on the pre-search item. */
	close(restore: boolean): void {
		if (!this.barEl) return;
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
			this.scope = null;
		}
		this.barEl.remove();
		this.barEl = null;
		this.inputEl = null;
		if (restore) focusItem(this.app, this.restoreItem);
		this.restoreItem = null;
		ensureTreeFocus(this.app);
	}

	/** n/N: jump to the next/previous match of the last query. */
	next(direction: 'forwards' | 'backwards'): void {
		if (!this.lastQuery) return;
		const match = findMatch(this.app, this.lastQuery, direction, false);
		if (match) focusItem(this.app, match);
	}

	destroy(): void {
		this.close(false);
	}

	private onInput(): void {
		const query = this.inputEl?.value ?? '';
		this.lastQuery = query;
		if (!query) return;
		const match = findMatch(this.app, query, 'forwards', true);
		if (match) focusItem(this.app, match);
	}
}

/**
 * Case-insensitive substring search over the visible items, circular,
 * starting from the focused item. includeCurrent lets incremental typing
 * keep a still-matching item instead of hopping to the next one.
 */
function findMatch(
	app: App,
	query: string,
	direction: 'forwards' | 'backwards',
	includeCurrent: boolean,
): ExplorerItem | null {
	const items = getVisibleItems(app);
	const needle = query.toLowerCase();
	if (items.length === 0 || needle === '') return null;

	const current = getFocusedItem(app);
	const from = current ? items.indexOf(current) : -1;
	const count = items.length;
	const base = from >= 0 ? from : direction === 'forwards' ? -1 : count;
	const firstStep = includeCurrent && from >= 0 ? 0 : 1;

	for (let step = firstStep; step <= count; step++) {
		const offset = direction === 'forwards' ? step : -step;
		const index = (((base + offset) % count) + count) % count;
		const item = items[index];
		if (item && itemName(item).toLowerCase().includes(needle)) return item;
	}
	return null;
}

function itemName(item: ExplorerItem): string {
	return item.file?.name ?? '';
}
