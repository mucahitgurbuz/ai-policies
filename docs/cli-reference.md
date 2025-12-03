# CLI Reference

Complete reference for all AI Policies CLI commands.

## Global Options

```bash
ai-policies --help     # Show help
ai-policies --version  # Show version
```

---

## Commands

### `init`

Initialize AI Policies in the current directory.

```bash
ai-policies init [options]
```

**Options:**

| Option     | Alias | Description                                             |
| ---------- | ----- | ------------------------------------------------------- |
| `--force`  | `-f`  | Overwrite existing configuration                        |
| `--preset` | `-p`  | Use preset: `basic`, `frontend`, `backend`, `fullstack` |

**Examples:**

```bash
# Interactive setup
ai-policies init

# Use preset without prompts
ai-policies init --preset frontend

# Overwrite existing config
ai-policies init --force
```

---

### `sync`

Generate IDE configuration files from policy packages.

```bash
ai-policies sync [options]
```

**Options:**

| Option      | Alias | Description                           |
| ----------- | ----- | ------------------------------------- |
| `--dry`     | `-d`  | Preview changes without writing files |
| `--verbose` | `-v`  | Show detailed output                  |

**Examples:**

```bash
# Generate configurations
ai-policies sync

# Preview what would be generated
ai-policies sync --dry

# Verbose output
ai-policies sync --verbose
```

---

### `diff`

Show differences between current and generated configurations.

```bash
ai-policies diff [output]
```

**Arguments:**

| Argument | Description                                                |
| -------- | ---------------------------------------------------------- |
| `output` | Optional: `cursor` or `copilot` to show specific diff only |

**Examples:**

```bash
# Show all differences
ai-policies diff

# Show only Cursor diff
ai-policies diff cursor
```

---

### `update`

Update policy packages to latest compatible versions.

```bash
ai-policies update [package] [options]
```

**Options:**

| Option  | Alias | Description                |
| ------- | ----- | -------------------------- |
| `--all` | `-a`  | Update all packages        |
| `--dry` | `-d`  | Show what would be updated |

**Examples:**

```bash
# Update all packages
ai-policies update --all

# Update specific package
ai-policies update @ai-policies/core@^1.1.0

# Preview updates
ai-policies update --all --dry
```

---

### `validate`

Validate configuration and policy partials.

```bash
ai-policies validate [options]
```

**Options:**

| Option       | Alias | Description                     |
| ------------ | ----- | ------------------------------- |
| `--schema`   | `-s`  | Validate only schema compliance |
| `--partials` | `-p`  | Validate policy partials format |

**Examples:**

```bash
# Full validation
ai-policies validate

# Schema only
ai-policies validate --schema
```

---

### `doctor`

Check for common issues and configuration problems.

```bash
ai-policies doctor [options]
```

**Options:**

| Option  | Alias | Description                             |
| ------- | ----- | --------------------------------------- |
| `--fix` | `-f`  | Automatically fix issues where possible |

**Examples:**

```bash
# Run health check
ai-policies doctor

# Auto-fix issues
ai-policies doctor --fix
```

---

## Configuration File

The `.ai-policies.yaml` file controls all behavior:

```yaml
# Required policy packages
requires:
  '@ai-policies/core': '^1.0.0'
  '@ai-policies/frontend-react': '^1.0.0'

# Output file paths
output:
  cursor: ./.cursorrules
  copilot: ./.copilot/instructions.md

# Composition settings
compose:
  order: [core, domain, stack, team]
  protectedLayers: [core]
  teamAppend: true

# Optional: Team customizations
overrides:
  teamAppendContent: |
    ## Team Rules
    - Custom rule 1
    - Custom rule 2
  excludePartials:
    - partial-id-to-skip
```

## Exit Codes

| Code | Meaning |
| ---- | ------- |
| 0    | Success |
| 1    | Error   |
