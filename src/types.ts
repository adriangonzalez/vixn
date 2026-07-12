import { TAbstractFile, TFolder, View } from 'obsidian';

/*
 * Hand-written interfaces for the undocumented file explorer internals.
 * The file explorer has no public API, so these shapes may drift in a
 * future Obsidian release. Every property is optional and all access
 * must fail soft: do nothing rather than throw.
 */

export interface ExplorerItem {
	file?: TAbstractFile;
	selfEl?: HTMLElement;
	parent?: ExplorerItem;
	/** Present on folder items only. */
	collapsed?: boolean;
	/** Present on folder items only; children are in display order. */
	vChildren?: {
		children?: ExplorerItem[];
	};
	/** Layout state managed by the virtualized scroller. */
	info?: {
		hidden?: boolean;
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
	setCollapseAll?: (collapsed: boolean) => void;
	/**
	 * setCollapseAll's no-op guard compares against this cached flag, which
	 * goes stale when folders are toggled individually — reset it before
	 * calling setCollapseAll with an absolute value.
	 */
	isAllCollapsed?: boolean;
	/** Bound view callback behind the native F2/Enter rename key. */
	handleRenameFocusedItem?: (evt: KeyboardEvent) => void;
	/**
	 * Bound view callback behind the native delete key; prompts according
	 * to the user's confirm-deletion setting and skips the vault root.
	 */
	handleDeleteSelectedItems?: (evt: KeyboardEvent) => void;
}

export interface ExplorerView extends View {
	tree?: ExplorerTree;
	/**
	 * Expands collapsed ancestors, sets the tree's focused item to the
	 * file's item, and scrolls it into view on the next frame.
	 */
	revealInFolder?: (file: TAbstractFile) => void;
	/**
	 * The explorer's own "new note/folder" flow: creates the file and, for
	 * notes, opens it with the title selected for naming.
	 */
	createAbstractFile?: (
		kind: 'file' | 'folder',
		folder: TFolder | null,
		newLeaf: boolean | string,
	) => Promise<void>;
}
