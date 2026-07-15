import { App, Platform, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ExplorerItem, ExplorerTree, ExplorerView, RevealApp } from './types';

const EXPLORER_VIEW_TYPE = 'file-explorer';
const TREE_CONTAINER_SELECTOR = '.nav-files-container';

export function getExplorerLeaf(app: App): WorkspaceLeaf | null {
	return app.workspace.getLeavesOfType(EXPLORER_VIEW_TYPE)[0] ?? null;
}

export function getExplorerView(app: App): ExplorerView | null {
	return getExplorerLeaf(app)?.view ?? null;
}

function getTree(app: App): ExplorerTree | null {
	return getExplorerView(app)?.tree ?? null;
}

export function getTreeContainer(app: App): HTMLElement | null {
	return (
		getExplorerView(app)?.containerEl.querySelector<HTMLElement>(
			TREE_CONTAINER_SELECTOR,
		) ?? null
	);
}

/**
 * Re-assert keyboard focus on the tree container. Obsidian's own key
 * handling (or a virtualized re-render) can drop DOM focus after a move,
 * which would make every subsequent key press invisible to us.
 */
export function ensureTreeFocus(app: App): void {
	const container = getTreeContainer(app);
	if (!container) return;
	const active = container.ownerDocument.activeElement;
	if (active && container.contains(active)) return;
	if (!container.hasAttribute('tabindex')) container.tabIndex = -1;
	container.focus();
}

/** True when a key event originates from the explorer's file tree (not a rename field or nav button). */
export function isExplorerTreeEvent(evt: KeyboardEvent): boolean {
	return isTreeTarget(evt.target);
}

/**
 * True when a click lands in the tree. Used to grab DOM focus on click:
 * on Windows/Linux a click doesn't move focus into the container by
 * itself, so the key listener would otherwise never engage.
 */
export function isTreeClick(evt: MouseEvent): boolean {
	return isTreeTarget(evt.target);
}

function isTreeTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (isEditable(target)) return false;
	return target.closest(TREE_CONTAINER_SELECTOR) !== null;
}

function isEditable(el: HTMLElement): boolean {
	if (el.isContentEditable) return true;
	const tag = el.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Dispatch a synthetic key event so Obsidian's own tree navigation handles the movement. */
export function sendNavKey(target: EventTarget, key: string): void {
	target.dispatchEvent(
		new KeyboardEvent('keydown', {
			key,
			code: key,
			bubbles: true,
			cancelable: true,
		}),
	);
}

export function getFocusedItem(app: App): ExplorerItem | null {
	return getTree(app)?.focusedItem ?? null;
}

/**
 * Open the focused file in the active tab via the public API. Dispatching
 * Enter is not an option: the tree's native Enter starts a rename.
 * Returns true when a file was opened (focus then belongs to the editor).
 */
export function openFocusedFile(app: App): boolean {
	const file = getFocusedItem(app)?.file;
	if (!(file instanceof TFile)) return false;
	void app.workspace.getLeaf(false).openFile(file);
	return true;
}

export function isFolderItem(item: ExplorerItem): boolean {
	return item.vChildren !== undefined;
}

export function isExpandedFolder(item: ExplorerItem): boolean {
	return isFolderItem(item) && item.collapsed === false;
}

/** gg: jump to the first visible item. */
export function focusFirst(app: App, target: EventTarget): void {
	jumpFromRoot(app, target, 'ArrowDown');
}

/** G: jump to the last visible item. */
export function focusLast(app: App, target: EventTarget): void {
	jumpFromRoot(app, target, 'ArrowUp');
}

/**
 * Native tree semantics: when focusedItem is the root sentinel, ArrowDown
 * focuses the first visible item and ArrowUp wraps to the last, scrolling
 * included. Clearing via setFocusedItem(null) alone is not enough — the
 * tree then anchors on the last-clicked item (activeDom) instead.
 */
function jumpFromRoot(
	app: App,
	target: EventTarget,
	key: 'ArrowDown' | 'ArrowUp',
): void {
	const tree = getTree(app);
	if (!tree?.setFocusedItem || !tree.root) return;
	// Clear first so the current item's has-focus class is removed; the
	// root must then be assigned directly because setFocusedItem ignores it.
	tree.setFocusedItem(null);
	tree.focusedItem = tree.root;
	sendNavKey(target, key);
}

/**
 * Reveal the explorer pane, land the tree's focused item on the active
 * file (expanding folders as needed), and give the tree keyboard focus.
 */
export async function focusExplorer(app: App): Promise<void> {
	const leaf = getExplorerLeaf(app);
	if (!leaf) return;
	await app.workspace.revealLeaf(leaf);
	const file = app.workspace.getActiveFile();
	if (file) getExplorerView(app)?.revealInFolder?.(file);
	ensureTreeFocus(app);
}

/** Escape: hand keyboard focus back to the most recent main-area pane. */
export function focusEditor(app: App): void {
	const leaf = app.workspace.getMostRecentLeaf(app.workspace.rootSplit);
	if (leaf) app.workspace.setActiveLeaf(leaf, { focus: true });
}

export function focusItem(app: App, item: ExplorerItem | null): void {
	getTree(app)?.setFocusedItem?.(item);
}

/** All items currently visible in the tree, in display order. */
export function getVisibleItems(app: App): ExplorerItem[] {
	const items: ExplorerItem[] = [];
	const walk = (parent: ExplorerItem): void => {
		for (const child of parent.vChildren?.children ?? []) {
			if (child.info?.hidden) continue;
			items.push(child);
			if (child.vChildren && child.collapsed === false) walk(child);
		}
	};
	const root = getTree(app)?.root;
	if (root) walk(root);
	return items;
}

/** zM/zR: the tree's native collapse-all / expand-all. */
export function setAllCollapsed(app: App, collapsed: boolean): void {
	const tree = getTree(app);
	if (!tree?.setCollapseAll) return;
	// setCollapseAll no-ops when its cached isAllCollapsed flag already
	// matches, and that cache goes stale (only the header button updates
	// it) — force it to the opposite so the call always takes effect.
	tree.isAllCollapsed = !collapsed;
	tree.setCollapseAll(collapsed);
	if (!collapsed) return;
	// The focused item may now sit inside a collapsed folder; move focus
	// to its nearest visible ancestor, mirroring the native ArrowLeft
	// behavior. Deferred because collapsing updates state asynchronously.
	window.setTimeout(() => {
		let item = getTree(app)?.focusedItem ?? null;
		if (!item) return;
		while (item.parent && item.parent.collapsed) item = item.parent;
		tree.setFocusedItem?.(item);
	}, 0);
}

/** r: start the explorer's inline rename on the focused item. */
export function renameFocused(app: App): void {
	getTree(app)?.handleRenameFocusedItem?.(new KeyboardEvent('keydown'));
}

/** d: the explorer's own delete flow (respects the confirm setting). */
export function deleteFocused(app: App): void {
	getTree(app)?.handleDeleteSelectedItems?.(new KeyboardEvent('keydown'));
}

/**
 * J/K: dispatch the tree's native Mod+Arrow, which moves the selection and
 * background-opens the focused file — all inside the tree's own handler, so
 * its keyboard scope stays intact. (Opening via the workspace API instead
 * switches the active scope and silently kills further navigation.) On a
 * folder the native handler just moves, matching plain j/k.
 */
export function sendPreviewNavKey(
	target: EventTarget,
	key: 'ArrowUp' | 'ArrowDown',
): void {
	// "Mod" is Cmd on macOS, Ctrl elsewhere — match what isModEvent checks.
	const mod = Platform.isMacOS ? { metaKey: true } : { ctrlKey: true };
	target.dispatchEvent(
		new KeyboardEvent('keydown', {
			key,
			code: key,
			bubbles: true,
			cancelable: true,
			...mod,
		}),
	);
}

/** x: reveal the focused item in the OS file manager (desktop only). */
export function revealFocusedInSystem(app: App): void {
	if (!Platform.isDesktopApp) return;
	const file = getFocusedItem(app)?.file;
	if (!file) return;
	(app as RevealApp).showInFolder?.(file.path);
}

/**
 * a: new note in the focused folder (or the focused file's folder),
 * created through the explorer's own flow so the title is selected for
 * naming. Falls back to the vault's default new-file location.
 */
export function createNewNote(app: App): void {
	const view = getExplorerView(app);
	if (!view?.createAbstractFile) return;
	const focused = getFocusedItem(app)?.file;
	let folder: TFolder | null = null;
	if (focused instanceof TFolder) folder = focused;
	else if (focused instanceof TFile) folder = focused.parent;
	folder ??= app.fileManager.getNewFileParent(
		app.workspace.getActiveFile()?.path ?? '',
	);
	void view.createAbstractFile('file', folder, 'tab');
}
