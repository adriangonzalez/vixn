export type VixnAction =
	| 'down'
	| 'up'
	| 'collapseOrParent'
	| 'expandOrOpen'
	| 'open'
	| 'first'
	| 'last'
	| 'collapseAll'
	| 'expandAll'
	| 'find'
	| 'findNext'
	| 'findPrev'
	| 'newNote'
	| 'rename'
	| 'delete'
	| 'reveal'
	| 'focusEditor';

/** Actions gated behind the "File operations" setting. */
export const FILE_OP_ACTIONS: ReadonlySet<VixnAction> = new Set([
	'newNote',
	'rename',
	'delete',
]);

const SEQUENCE_TIMEOUT_MS = 1000;

/** Resolves key presses to actions, tracking pending g/z key sequences. */
export class KeySequencer {
	private pending: 'g' | 'z' | null = null;
	private timer: number | null = null;

	/**
	 * Returns the action for this key press, 'pending' when the key starts a
	 * sequence (consume it and wait for the next key), or null when unmapped.
	 */
	resolve(key: string): VixnAction | 'pending' | null {
		// A bare modifier press (e.g. the Shift of zM's M) must not
		// consume or cancel a pending sequence.
		if (
			key === 'Shift' ||
			key === 'Control' ||
			key === 'Alt' ||
			key === 'Meta' ||
			key === 'CapsLock'
		) {
			return null;
		}
		if (this.pending !== null) {
			const pending = this.pending;
			this.reset();
			if (pending === 'g' && key === 'g') return 'first';
			if (pending === 'z' && key === 'M') return 'collapseAll';
			if (pending === 'z' && key === 'R') return 'expandAll';
			// The orphaned prefix is discarded; the new key is handled below.
		}
		switch (key) {
			case 'j':
				return 'down';
			case 'k':
				return 'up';
			case 'h':
				return 'collapseOrParent';
			case 'l':
				return 'expandOrOpen';
			// Enter is deliberately unmapped: it falls through to the tree's
			// native handler (rename on macOS, open elsewhere).
			case 'o':
				return 'open';
			case 'G':
				return 'last';
			case '/':
				return 'find';
			case 'n':
				return 'findNext';
			case 'N':
				return 'findPrev';
			case 'a':
				return 'newNote';
			case 'r':
				return 'rename';
			case 'd':
				return 'delete';
			case 'x':
				return 'reveal';
			case 'g':
			case 'z':
				this.startSequence(key);
				return 'pending';
			case 'Escape':
				return 'focusEditor';
			default:
				return null;
		}
	}

	private startSequence(key: 'g' | 'z'): void {
		this.pending = key;
		this.timer = window.setTimeout(() => this.reset(), SEQUENCE_TIMEOUT_MS);
	}

	reset(): void {
		this.pending = null;
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
