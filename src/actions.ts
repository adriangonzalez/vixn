import { App } from 'obsidian';
import { VixnAction } from './keymap';
import { VixnSettings } from './settings';
import {
	focusEditor,
	focusFirst,
	focusLast,
	getFocusedItem,
	isExpandedFolder,
	isFolderItem,
	openFocusedFile,
	sendNavKey,
} from './explorer';

/**
 * Run a navigation action. Returns true when keyboard focus should stay
 * on the explorer tree afterwards (i.e. the action did not hand focus to
 * the editor).
 */
export function runAction(
	app: App,
	settings: VixnSettings,
	action: VixnAction,
	target: EventTarget,
): boolean {
	switch (action) {
		case 'down':
			sendNavKey(target, 'ArrowDown');
			return true;
		case 'up':
			sendNavKey(target, 'ArrowUp');
			return true;
		case 'collapseOrParent':
			collapseOrParent(app, settings, target);
			return true;
		case 'expandOrOpen':
			return expandOrOpen(app, target);
		case 'open':
			return openOrToggle(app, target);
		case 'first':
			focusFirst(app, target);
			return true;
		case 'last':
			focusLast(app, target);
			return true;
		case 'focusEditor':
			focusEditor(app);
			return false;
	}
}

function collapseOrParent(
	app: App,
	settings: VixnSettings,
	target: EventTarget,
): void {
	if (!settings.hJumpsToParent) {
		// Collapse in place only: swallow h when the native ArrowLeft would
		// move focus to the parent folder instead of collapsing.
		const item = getFocusedItem(app);
		if (item && !isExpandedFolder(item)) return;
	}
	sendNavKey(target, 'ArrowLeft');
}

function expandOrOpen(app: App, target: EventTarget): boolean {
	const item = getFocusedItem(app);
	if (item && !isFolderItem(item)) {
		return !openFocusedFile(app);
	}
	sendNavKey(target, 'ArrowRight');
	return true;
}

function openOrToggle(app: App, target: EventTarget): boolean {
	const item = getFocusedItem(app);
	if (!item) return true;
	if (isFolderItem(item)) {
		// ArrowLeft collapses an expanded folder in place; ArrowRight expands.
		sendNavKey(target, isExpandedFolder(item) ? 'ArrowLeft' : 'ArrowRight');
		return true;
	}
	return !openFocusedFile(app);
}
