#!/bin/bash

# Automatically determine the repository from the git remote origin URL
REPO_URL=$(git config --get remote.origin.url)
# Extract owner/repo from the URL (handles both https and ssh formats)
if [[ "$REPO_URL" =~ github.com[:/]([^/]+)/([^./]+)(\.git)? ]]; then
  REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
else
  echo "Could not determine repository from git remote origin URL: $REPO_URL"
  echo "Please set the REPO variable manually in the script, e.g., REPO="owner/repo""
  exit 1
fi

# Optional: First argument can be a specific RUN_ID
RUN_ID_ARG="$1"
WORKFLOW_FILE=""
JOB_NAME=""

# If the first argument is a number, assume it's a RUN_ID.
# Otherwise, assume it's a workflow file.
if [[ "$RUN_ID_ARG" =~ ^[0-9]+$ ]]; then
  RUN_ID="$RUN_ID_ARG"
  JOB_NAME="$2"
  echo "Using specified RUN_ID: $RUN_ID"
else
  WORKFLOW_FILE="$1"
  JOB_NAME="$2"
  if [ -n "$WORKFLOW_FILE" ]; then
    echo "Filtering by workflow file: $WORKFLOW_FILE"
  fi
fi

if [ -n "$JOB_NAME" ]; then
  echo "Filtering by job name: $JOB_NAME"
fi

echo "Repository: $REPO"

# If RUN_ID was not provided as an argument, get the latest run's ID
if [ -z "$RUN_ID" ]; then
  RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW_FILE" --limit 1 --json databaseId -q '.[0].databaseId')
fi


if [ -z "$RUN_ID" ]; then
  echo "No workflow runs found for workflow: $WORKFLOW_FILE"
  exit 1
fi

echo "Workflow run ID: $RUN_ID"

if [ -n "$JOB_NAME" ]; then
    # Get the job ID from the job name
    JOB_ID=$(gh run view "$RUN_ID" --repo "$REPO" --json jobs -q ".jobs[] | select(.name == \"$JOB_NAME\") | .databaseId")
    if [ -z "$JOB_ID" ]; then
        echo "No job found with name: $JOB_NAME"
        exit 1
    fi
    echo "Found job ID: $JOB_ID for job name: $JOB_NAME"
    # Dump logs for the specific job
    gh run view "$RUN_ID" --repo "$REPO" --job "$JOB_ID" --log
else
    # Dump logs via GH CLI for the entire run
    gh run view "$RUN_ID" --repo "$REPO" --log
fi
