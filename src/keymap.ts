export type VixnAction =
	| 'down'
	| 'up'
	| 'collapseOrParent'
	| 'expandOrOpen'
	| 'open'
	| 'first'
	| 'last'
	| 'focusEditor';

const SEQUENCE_TIMEOUT_MS = 1000;

/** Resolves key presses to actions, tracking the pending "g" of a gg sequence. */
export class KeySequencer {
	private pendingG = false;
	private timer: number | null = null;

	/**
	 * Returns the action for this key press, 'pending' when the key starts a
	 * sequence (consume it and wait for the next key), or null when unmapped.
	 */
	resolve(key: string): VixnAction | 'pending' | null {
		if (this.pendingG) {
			this.reset();
			if (key === 'g') return 'first';
			// The orphaned g is discarded; the new key is handled normally below.
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
			// native handler, which starts a rename.
			case 'o':
				return 'open';
			case 'G':
				return 'last';
			case 'g':
				this.pendingG = true;
				this.timer = window.setTimeout(
					() => this.reset(),
					SEQUENCE_TIMEOUT_MS,
				);
				return 'pending';
			case 'Escape':
				return 'focusEditor';
			default:
				return null;
		}
	}

	reset(): void {
		this.pendingG = false;
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
