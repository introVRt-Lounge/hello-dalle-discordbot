#!/bin/bash

# Function to print the current version and usage instructions
print_usage() {
  current_version=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json)
  echo "Current version: $current_version"
  echo "Usage: $0 {subminor|minor|major} -m \"<description>\" [-s <version>] [--dryrun] [-h]"
  echo "Options:"
  echo "  subminor           Increment the subminor version (e.g., 1.1.0 -> 1.1.1)"
  echo "  minor              Increment the minor version (e.g., 1.1.0 -> 1.2.0)"
  echo "  major              Increment the major version (e.g., 1.1.0 -> 2.0.0)"
  echo "  -m <description>   Provide a description for the release"
  echo "  -s <version>       Set the version directly to <version> (e.g., 3.6.7)"
  echo "  --dryrun           Show what actions would be taken without making any changes"
  echo "  -h                 Show this help message and exit"
}

# Initialize variables
dryrun=false
description=""
mode=""
new_version=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        subminor|minor|major)
            mode="$1"
            shift
            ;;
        -m)
            if [[ -n "$2" ]]; then
                description="$2"
                shift
            else
                echo "Error: No description provided for the -m flag."
                print_usage
                exit 1
            fi
            shift
            ;;
        -s)
            if [[ -n "$2" ]]; then
                new_version="$2"
                shift
            else
                echo "Error: No version provided for the -s flag."
                print_usage
                exit 1
            fi
            shift
            ;;
        --dryrun)
            dryrun=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Ensure that a description is provided
if [[ -z "$description" ]]; then
  echo "Error: A description must be provided using the -m flag."
  print_usage
  exit 1
fi

# Read the current version from package.json
current_version=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json)

# Function to handle errors and exit
handle_error() {
  echo "Error: $1"
  exit 1
}

# Run tests first, and exit if they fail
echo "Running npm tests..."
npm test || { echo "Tests failed. Aborting version update."; exit 1; }

# Compile TypeScript files (optional, adjust paths as needed)
echo "Compiling TypeScript files..."
npx tsc || handle_error "TypeScript compilation failed."

# Run npm audit fix
echo "Running npm audit fix..."
npm audit fix || handle_error "npm audit fix failed."

# Split the version into major, minor, and subminor parts
IFS='.' read -r -a version_parts <<< "$current_version"

major=${version_parts[0]}
minor=${version_parts[1]}
subminor=${version_parts[2]}

# Increment the appropriate version part
case "$mode" in
  subminor)
    subminor=$((subminor + 1))
    ;;
  minor)
    minor=$((minor + 1))
    subminor=0
    ;;
  major)
    major=$((major + 1))
    minor=0
    subminor=0
    ;;
  *)
    echo "Invalid argument: $mode. Use 'subminor', 'minor', 'major', or '-s <version>'."
    exit 1
    ;;
esac

# Construct the new version string
new_version="$major.$minor.$subminor"

# Check for dry run
if $dryrun; then
  echo "Dry run: Version would be updated to $new_version and tagged as v$new_version"
  exit 0
fi

# Create a GitHub release tag and get the link
release_url="https://github.com/heavygee/hello-dalle-discordbot/releases/tag/v$new_version"
echo "Creating GitHub release for version v$new_version..."
gh release create "v$new_version" --title "v$new_version" --notes "$description" || handle_error "GitHub release creation failed"
echo "GitHub release created at $release_url"

# Replace the placeholder link in your codebase
echo "Updating release link in the codebase..."
sed -i "s|RELEASE_URL_PLACEHOLDER|$release_url|" src/config.ts || handle_error "Failed to update release link in the code"

# Add and commit any outstanding changes before version bump
git add . || handle_error "Git add failed"
git commit -m "Update release link to $release_url and bump version to $new_version" || handle_error "Git commit failed"

# Update the version in package.json
sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json || handle_error "Version update failed in package.json"

# Regenerate the package-lock.json file to reflect the new version
npm install || handle_error "npm install failed"

# Commit the changes and create a Git tag
git add package.json package-lock.json || handle_error "Git add failed"
git commit -m "Bump version to $new_version" || handle_error "Git commit failed"
git push origin main || handle_error "Git push failed"

echo "Version updated to $new_version and release link included in code."
