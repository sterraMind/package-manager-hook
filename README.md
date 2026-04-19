# package-manager-hook

OpenCode plugin that automatically rewrites npm/pip commands to pnpm/uv.

## What it does

- `npm install` → `pnpm install`
- `pip install` → `uv pip`
- `python -m pip install` → `uv pip`
- `python script.py` → `uv run python script.py`
- `npx xxx` → `pnpm dlx xxx`

Commands starting with uv, pnpm, or rtk are not modified.

## Installation

```bash
npm install package-manager-hook
```

Add to your opencode.json:

```json
{
  "plugin": ["package-manager-hook"]
}
```

Or copy src/index.ts to `~/.config/opencode/plugins/package-manager-hook.ts`.

## Requirements

- [pnpm](https://pnpm.io/) must be installed
- [uv](https://github.com/astral-sh/uv) must be installed

The plugin checks for these at startup and only activates if both are found.