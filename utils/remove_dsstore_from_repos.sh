#!/usr/bin/env bash
# remove_dsstore_from_repos.sh
# Scans a parent directory for Git repositories, removes tracked .DS_Store files from each repo's index,
# and optionally commits the removal. Dry-run by default.

set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [PARENT_DIR]

Scans PARENT_DIR (default: current directory) for Git repositories and removes tracked .DS_Store files.

Options:
  --yes       Perform the removals and create a commit in repos where tracked .DS_Store files are found.
  --help      Show this help message.

Examples:
  # Dry-run over current directory (safe)
  $(basename "$0")

  # Dry-run over a specific parent folder
  $(basename "$0") /path/to/projects

  # Actually remove and commit across repos (use carefully)
  $(basename "$0") --yes /path/to/projects

EOF
}

DRY_RUN=true
PARENT_DIR="."

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      DRY_RUN=false
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      PARENT_DIR="$1"
      shift
      ;;
  esac
done

# resolve parent dir
PARENT_DIR="$(cd "$PARENT_DIR" 2>/dev/null && pwd || echo "$PARENT_DIR")"
if [[ ! -d "$PARENT_DIR" ]]; then
  echo "Parent directory not found: $PARENT_DIR" >&2
  exit 2
fi

echo "Scanning parent directory: $PARENT_DIR"
if $DRY_RUN; then
  echo "Mode: DRY RUN (no changes). Use --yes to apply changes and commit."
else
  echo "Mode: APPLY (will remove tracked .DS_Store and commit where needed)."
fi

# find .git directories (skip nested .git inside working tree if any)
mapfile -t gitdirs < <(find "$PARENT_DIR" -type d -name .git -prune 2>/dev/null)

if [[ ${#gitdirs[@]} -eq 0 ]]; then
  echo "No Git repositories found under $PARENT_DIR"
  exit 0
fi

for gitdir in "${gitdirs[@]}"; do
  repo_root="$(dirname "$gitdir")"
  echo
  echo "== Repository: $repo_root =="

  # check if this is a valid git repo
  if ! git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  Not a normal git work tree, skipping."
    continue
  fi

  # list tracked .DS_Store files (null separated)
  tracked_count=0
  if git -C "$repo_root" ls-files -z "*.DS_Store" >/dev/null 2>&1; then
    # capture output
    mapfile -t tracked_files < <(git -C "$repo_root" ls-files -z "*.DS_Store" | tr '\0' '\n' | sed '/^$/d')
    tracked_count=${#tracked_files[@]}
  fi

  if [[ $tracked_count -eq 0 ]]; then
    echo "  No tracked .DS_Store files found."
    continue
  fi

  echo "  Tracked .DS_Store files (count: $tracked_count):"
  for f in "${tracked_files[@]}"; do
    echo "    $f"
  done

  if $DRY_RUN; then
    echo "  (dry-run) would remove these files from git index in $repo_root"
    continue
  fi

  # Remove tracked files from index but leave them on disk
  echo "  Removing tracked .DS_Store files from git index..."
  # Use -z and xargs -0 to be safe with weird filenames
  git -C "$repo_root" ls-files -z "*.DS_Store" | xargs -0 --no-run-if-empty git -C "$repo_root" rm --cached --ignore-unmatch --quiet --

  # If there are staged changes, commit them
  if [[ -n "$(git -C "$repo_root" status --porcelain)" ]]; then
    echo "  Staging and committing removal..."
    # Commit only the removals (git rm already staged the removals)
    git -C "$repo_root" commit -m "chore: remove tracked .DS_Store files" --quiet || {
      # If commit failed (e.g., no user.email configured), stage and show status for manual commit
      echo "  Automatic commit failed; staging changes and showing status for manual commit."
      git -C "$repo_root" add -A
      git -C "$repo_root" status --short
    }
    echo "  Committed in $repo_root"
  else
    echo "  No changes to commit in $repo_root"
  fi
done

echo
echo "Done. If you ran in dry-run mode, re-run with --yes to apply changes."