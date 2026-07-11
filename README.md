# Vixn

Vim-style keyboard navigation for the Obsidian file explorer, inspired by the explorer workflow of [VSCodeVim](https://github.com/VSCodeVim/Vim).

The keys are active only while the file explorer tree has keyboard focus — they never interfere with the editor, search, or renaming. Vixn doesn't reimplement tree navigation; it translates vim keys into the explorer's own native movement, so selection, scrolling, and folding all behave exactly as Obsidian intends.

## Keymap

| Key | Action |
| --- | --- |
| `j` | Move down |
| `k` | Move up |
| `h` | Collapse folder; on a file or collapsed folder, jump to the parent folder |
| `l` | Expand folder; on a file, open it |
| `o` | Open file, or toggle folder |
| `gg` | Jump to the first item |
| `G` | Jump to the last item |
| `Escape` | Return focus to the editor |

Keys Vixn deliberately leaves native: `Enter` (rename on macOS, open on Windows/Linux), `Space` (open), `F2` (rename), and the arrow keys.

## Getting into the explorer

Navigation only works while the explorer tree has keyboard focus. Click anywhere in the file list, or use the **Vixn: Focus file explorer** command — assign it a hotkey (for example `Ctrl+Shift+E`, as in VS Code) for a fully keyboard-driven loop: jump to the explorer, navigate, open a file, and `Escape` back whenever you need the list again.

## Settings

- **Vim navigation** — master toggle for all key handling.
- **Move to parent folder with h** — when off, `h` only collapses the current folder and never jumps to the parent.

## Installation

Vixn is not in the community catalog yet. To install manually, copy `main.js` and `manifest.json` into:

```
<Vault>/.obsidian/plugins/vixn/
```

Then reload Obsidian and enable **Vixn** in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev     # watch mode, rebuilds main.js on change
npm run build   # type-check + production build
npm run lint    # ESLint with Obsidian plugin rules
```

Source layout:

- `src/main.ts` — plugin lifecycle and the single capture-phase key listener
- `src/keymap.ts` — key-to-action resolution, including the `gg` sequence
- `src/actions.ts` — navigation actions
- `src/explorer.ts` — adapter for the file explorer; all contact with undocumented internals lives here and fails soft
- `src/types.ts` — minimal interfaces for those internals
- `src/settings.ts` — settings tab and defaults

### A note on internals

The file explorer has no public API. Movement works through synthetic arrow-key events handled by Obsidian's own tree navigation, which keeps coupling low; only the `gg`/`G` jumps and the smart `h`/`l` behaviors read internal tree state. If a future Obsidian release changes those internals, the affected keys degrade to doing nothing rather than breaking the plugin.

## Requirements

Requires Obsidian 1.7.2 or later. Works on desktop and mobile (though it is only useful with a physical keyboard).
