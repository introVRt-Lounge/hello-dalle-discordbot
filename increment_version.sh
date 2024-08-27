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

# Check for help flag
if [[ "$1" == "-h" ]]; then
  print_usage
  exit 0
fi

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
            description="$2"
            shift
            shift
            ;;
        -s)
            new_version="$2"
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

# Handle the override flag (-s) to set the version directly
if [[ -n "$new_version" ]]; then
  if $dryrun; then
    echo "Dry run: Version would be set to $new_version and tagged as v$new_version"
    exit 0
  else
    sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json
    npm install
    git add package.json package-lock.json
    git commit -m "Bump version to $new_version"
    git tag "v$new_version"
    git push origin main
    git push origin "v$new_version"
    echo "Version set to $new_version and tagged as v$new_version"
    
    # Update version_info.json
    jq --arg version "$new_version" --arg desc "$description" '.[$version] = {description: $desc, changelog_url: "https://github.com/heavygee/hello-dalle-discordbot/releases/tag/v" + $version}' version_info.json > temp.json && mv temp.json version_info.json
    
    # Docker Hub push
    echo "Building Docker image and pushing to Docker Hub..."
    docker build -t heavygee/hello-dalle-discordbot:latest .
    docker tag heavygee/hello-dalle-discordbot:latest heavygee/hello-dalle-discordbot:$new_version
    docker push heavygee/hello-dalle-discordbot:latest
    docker push heavygee/hello-dalle-discordbot:$new_version
    echo "Docker image pushed to Docker Hub with tags latest and $new_version"
    
    # Create GitHub release with the provided description
    gh release create "v$new_version" --title "v$new_version" --notes "$description"
    echo "Release v$new_version created on GitHub with description: $description"
    exit 0
  fi
fi

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

# Update the version in package.json
sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json

# Regenerate the package-lock.json file to reflect the new version
npm install

# Commit the changes and create a Git tag
git add package.json package-lock.json
git commit -m "Bump version to $new_version"
git tag "v$new_version"
git push origin main
git push origin "v$new_version"

echo "Version updated to $new_version and tagged as v$new_version"

# Update version_info.json
jq --arg version "$new_version" --arg desc "$description" '.[$version] = {description: $desc, changelog_url: ("https://github.com/heavygee/hello-dalle-discordbot/releases/tag/v" + $version)}' version_info.json > temp.json && mv temp.json version_info.json
git add version_info.json
git commit -m "Update version_info.json for $new_version"
git push origin main

# Docker Hub push
echo "Building Docker image and pushing to Docker Hub..."
docker build -t heavygee/hello-dalle-discordbot:latest .
docker tag heavygee/hello-dalle-discordbot:latest heavygee/hello-dalle-discordbot:$new_version
docker push heavygee/hello-dalle-discordbot:latest
docker push heavygee/hello-dalle-discordbot:$new_version
echo "Docker image pushed to Docker Hub with tags latest and $new_version"

# Create GitHub release with the provided description
gh release create "v$new_version" --title "v$new_version" --notes "$description"

echo "Release v$new_version created on GitHub with description: $description"
