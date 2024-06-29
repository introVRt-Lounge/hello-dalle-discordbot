#!/bin/bash

# Check if argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 {subminor|minor|major}"
  exit 1
fi

# Read the current version from package.json
current_version=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json)

# Split the version into major, minor, and subminor parts
IFS='.' read -r -a version_parts <<< "$current_version"

major=${version_parts[0]}
minor=${version_parts[1]}
subminor=${version_parts[2]}

# Increment the appropriate version part
case "$1" in
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
    echo "Invalid argument: $1. Use 'subminor', 'minor', or 'major'."
    exit 1
    ;;
esac

# Construct the new version string
new_version="$major.$minor.$subminor"

# Update the version in package.json
sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json

# Regenerate the package-lock.json file to reflect the new version
npm install

echo "Version updated to $new_version"
