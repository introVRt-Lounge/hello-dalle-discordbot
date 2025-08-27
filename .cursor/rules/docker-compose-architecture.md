# Docker Compose and System Architecture Rules

## Overview
This document outlines the rules for Docker Compose usage and system architecture in the hello-dalle-discordbot project.

## Rules

### Container Targeting
- Docker compose commands must ONLY target the hello-dalle-discordbot container
- Never use general docker-compose up/down commands without container filtering

### File Management
- The system uses a symlinked docker-compose.yml file for deployment
- The compose file is referenced through environment variables - do not specify the symlinked file directly

### Version Management
- Version management is handled through helpers/increment_version.sh for semantic versioning
