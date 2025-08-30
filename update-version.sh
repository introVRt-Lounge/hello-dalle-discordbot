#!/bin/bash
# Script to update version.txt with current git describe
# This keeps the dev version current

git describe --tags --always > version.txt
echo "Updated version.txt to: $(cat version.txt)"
