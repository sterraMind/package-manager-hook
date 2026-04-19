import type { Plugin } from "@opencode-ai/plugin"

// Command prefixes that should not be rewritten
const SKIP_PREFIXES = [/^uv\b/i, /^pnpm\b/i, /^rtk\b/i]

// Patterns for rewriting pip/python commands to uv
const UV_PATTERNS = [
  { pattern: /^(python(?:\d+(?:\.\d+)*)?|py)\s+-m\s+pip(?=\s|$)/i, replacement: "uv pip" },
  { pattern: /^pip(?:\d+(?:\.\d+)*)?(?=\s|$)/i, replacement: "uv pip" },
  { pattern: /^(python(?:\d+(?:\.\d+)*)?|py)(?=\s|$)/i, replacement: "uv run python" },
]

// Patterns for rewriting npm commands to pnpm
const PNPM_PATTERNS = [
  { pattern: /^npm\s+(install|i|add|remove|rm|uninstall|update|up|exec|list|ls)(?=\s|$)/i, replacement: "pnpm $1" },
  { pattern: /^npx(?=\s|$)/i, replacement: "pnpm dlx" },
]

async function commandExists($: Parameters<Plugin>[0]["$"], command: string): Promise<boolean> {
  const result = await $`
    powershell -Command "if (Get-Command ${command} -ErrorAction SilentlyContinue) { Write-Output 'yes' } else { Write-Output 'no' }"
  `.quiet().nothrow().text()

  return result.includes("yes")
}

function rewriteCommand(command: string, patterns: Array<{ pattern: RegExp; replacement: string }>): string {
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(command)) {
      return command.replace(pattern, replacement)
    }
  }
  return command
}

function shouldSkip(command: string): boolean {
  return SKIP_PREFIXES.some((pattern) => pattern.test(command.trim()))
}

export const PackageManagerHook: Plugin = async ({ $ }) => {
  const [hasUv, hasPnpm] = await Promise.all([
    commandExists($, "uv"),
    commandExists($, "pnpm"),
  ])

  if (!hasUv && !hasPnpm) {
    console.warn("[package-manager-hook] uv and pnpm not found in PATH — plugin disabled")
    return {}
  }

  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return

      const args = output?.args
      if (!args || typeof args !== "object") return

      const command = (args as Record<string, unknown>).command
      if (typeof command !== "string" || !command.trim()) return

      const trimmed = command.trim()
      if (shouldSkip(trimmed)) return

      let rewritten = trimmed

      if (hasUv) {
        rewritten = rewriteCommand(rewritten, UV_PATTERNS)
      }

      if (hasPnpm) {
        rewritten = rewriteCommand(rewritten, PNPM_PATTERNS)
      }

      if (rewritten !== trimmed) {
        ;(args as Record<string, unknown>).command = rewritten
      }
    },
  }
}