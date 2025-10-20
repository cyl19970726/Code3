#!/usr/bin/env bash
set -e

# Parse arguments
JSON_MODE=false
PATHS_ONLY=false
REQUIRE_TASKS=false
INCLUDE_TASKS=false

for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=true ;;
    --paths-only) PATHS_ONLY=true ;;
    --require-tasks) REQUIRE_TASKS=true ;;
    --include-tasks) INCLUDE_TASKS=true ;;
    --help|-h)
      echo "Usage: $0 [--json] [--paths-only] [--require-tasks] [--include-tasks]"
      echo ""
      echo "Options:"
      echo "  --json              Output in JSON format"
      echo "  --paths-only        Only return paths, skip AVAILABLE_DOCS check"
      echo "  --require-tasks     Require tasks.md to exist (error if missing)"
      echo "  --include-tasks     Include TASKS path in JSON output"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Run $0 --help for usage" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get feature paths
eval $(get_feature_paths)

# Check feature branch
check_feature_branch "$CURRENT_BRANCH" || exit 1

# Check feature directory exists
if [[ ! -d "$FEATURE_DIR" ]]; then
  echo "ERROR: Feature directory not found: $FEATURE_DIR" >&2
  echo "Run /specify first." >&2
  exit 1
fi

# Check plan.md exists
if [[ ! -f "$IMPL_PLAN" ]]; then
  echo "ERROR: plan.md not found in $FEATURE_DIR" >&2
  echo "Run /plan first." >&2
  exit 1
fi

# Check tasks.md if required
if $REQUIRE_TASKS; then
  if [[ ! -f "$TASKS" ]]; then
    echo "ERROR: tasks.md not found in $FEATURE_DIR" >&2
    echo "Run /tasks first." >&2
    exit 1
  fi
fi

# Output based on mode
if $JSON_MODE; then
  if $PATHS_ONLY; then
    # Paths-only mode: return core paths without checking optional docs
    printf '{"FEATURE_DIR":"%s","FEATURE_SPEC":"%s","IMPL_PLAN":"%s","TASKS":"%s"}\n' \
      "$FEATURE_DIR" "$FEATURE_SPEC" "$IMPL_PLAN" "$TASKS"
  else
    # Full mode: check available docs
    docs=()
    [[ -f "$RESEARCH" ]] && docs+=("research.md")
    [[ -f "$DATA_MODEL" ]] && docs+=("data-model.md")
    ([[ -d "$CONTRACTS_DIR" ]] && [[ -n "$(ls -A "$CONTRACTS_DIR" 2>/dev/null)" ]]) && docs+=("contracts/")
    [[ -f "$QUICKSTART" ]] && docs+=("quickstart.md")

    json_docs=$(printf '"%s",' "${docs[@]}")
    json_docs="[${json_docs%,}]"

    if $INCLUDE_TASKS; then
      printf '{"FEATURE_DIR":"%s","AVAILABLE_DOCS":%s,"TASKS":"%s"}\n' \
        "$FEATURE_DIR" "$json_docs" "$TASKS"
    else
      printf '{"FEATURE_DIR":"%s","AVAILABLE_DOCS":%s}\n' \
        "$FEATURE_DIR" "$json_docs"
    fi
  fi
else
  # Human-readable mode
  echo "FEATURE_DIR: $FEATURE_DIR"

  if ! $PATHS_ONLY; then
    echo "AVAILABLE_DOCS:"
    check_file "$RESEARCH" "research.md"
    check_file "$DATA_MODEL" "data-model.md"
    check_dir "$CONTRACTS_DIR" "contracts/"
    check_file "$QUICKSTART" "quickstart.md"
  fi

  if $INCLUDE_TASKS; then
    echo "TASKS: $TASKS"
  fi
fi
