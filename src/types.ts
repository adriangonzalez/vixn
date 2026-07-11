import { TAbstractFile, View } from 'obsidian';

/*
 * Hand-written interfaces for the undocumented file explorer internals.
 * The file explorer has no public API, so these shapes may drift in a
 * future Obsidian release. Every property is optional and all access
 * must fail soft: do nothing rather than throw.
 */

export interface ExplorerItem {
	file?: TAbstractFile;
	selfEl?: HTMLElement;
	/** Present on folder items only. */
	collapsed?: boolean;
	/** Present on folder items only; children are in display order. */
	vChildren?: {
		children?: ExplorerItem[];
	};
}

export interface ExplorerTree {
	focusedItem?: ExplorerItem | null;
	setFocusedItem?: (item: ExplorerItem | null) => void;
	/**
	 * The tree's root sentinel (infinityScroll.rootEl). Assigning it to
	 * focusedItem and sending ArrowDown/ArrowUp is the tree's own
	 * first-item / last-item jump (verified against the 1.x app bundle).
	 */
	root?: ExplorerItem;
}

export interface ExplorerView extends View {
	tree?: ExplorerTree;
}
