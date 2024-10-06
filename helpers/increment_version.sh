#!/bin/bash

# Function to print the current version and usage instructions
print_usage() {
  current_version=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json)
  echo "Current version: $current_version"
  echo "Usage: $0 {subminor|minor|major} -m \"<description>\" [-s <version>] [-h]"
  echo "Options:"
  echo "  subminor           Increment the subminor version (e.g., 1.1.0 -> 1.1.1)"
  echo "  minor              Increment the minor version (e.g., 1.1.0 -> 1.2.0)"
  echo "  major              Increment the major version (e.g., 1.1.0 -> 2.0.0)"
  echo "  -m <description>   Provide a description for the release"
  echo "  -s <version>       Set the version directly to <version> (e.g., 3.6.7)"
  echo "  -h                 Show this help message and exit"
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  print_usage
  exit 0
fi

# Initialize variables
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

# Compile TypeScript files
echo "Compiling TypeScript files..."
npx tsc || exit 1

# Run npm audit fix
echo "Running npm audit fix..."
npm audit fix || exit 1

# Run tests locally
echo "Running npm tests..."
npm test || exit 1  # Exit immediately if tests fail

# Read the current version from package.json
current_version=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json)

# Increment version logic
if [[ -z "$new_version" ]]; then
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
fi

# Update the version in package.json and version_info.json
sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json || exit 1

jq --arg version "$new_version" --arg desc "$description" \
    '.[$version] = {description: $desc, changelog_url: ("https://github.com/heavygee/hello-dalle-discordbot/releases/tag/v" + $version)}' \
    version_info.json > temp.json && mv temp.json version_info.json || exit 1

# Commit and push changes
git add package.json package-lock.json version_info.json || exit 1
git commit -m "Bump version to $new_version and update version_info.json" || exit 1

# Push to GitHub
git push origin main || handle_error "Git push failed"

echo "Version updated to $new_version and changes pushed successfully."

# Clean up temporary file if exists
[ -f temp.json ] && rm temp.json
