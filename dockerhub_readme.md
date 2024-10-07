## Hello DALL-E DiscordBot

### Overview

The Discord DALL-E Bot leverages OpenAI's DALL-E model to generate welcome images for new members joining your Discord server. When a new member joins, the bot uses their avatar and a customizable prompt to create a unique welcome image, ensuring each member feels special.

### Features
- **Welcome Images for New Members**: Automatically generates and sends a welcome image when new members join your server.
- **Profile Picture Suggestion for New Members Without an Avatar**: For users without a profile picture, the bot will create one based on their username and suggest it as their profile picture.
- **Gender Sensitivity Option**: Adds personalized touches to generated images based on perceivable characteristics. This is an optional feature, designed to make generated images more relatable, e.g., softer colors for traditionally feminine appearances, bold styles for traditionally masculine appearances. This feature must be explicitly enabled using an environment variable (`GENDER_SENSITIVITY`).
- **Image Generation**: Uses OpenAI's DALL-E to generate images and re-uploads them to Discord to avoid expiration.
- **Wildcard Feature**: Introduces variability in the prompts with a configurable chance of using an alternate prompt (default is 0% / disabled. 99 is max for 99% likely).
- **Image Storage**: Saves generated welcome images to a `welcome_images` subfolder with filenames based on the username and timestamp.
- **Delay Feature**: Configurable delay (default 2 minutes) before posting the welcome image to the `welcome` channel. The bot will inform admins in `#botspam` about the delay before the image is posted.
- **Stealth Welcome Messages**: Optionally configure the bot to post welcome messages in the `welcome` channel as silent messages, notifying only the new user without pinging everyone else. This can be controlled via the `STEALTH_WELCOME` environment variable.
- **Configurable Channels**: Allows specifying different channels for welcome images (`WELCOME_CHANNEL_ID`) and profile picture suggestions (`PROFILE_CHANNEL_ID`). These channels can be the same, at the user's discretion.

### Getting Started

#### Prerequisites

- Discord Bot Token
- OpenAI API Key

#### Environment Variables

Create a `.env` file with the following variables:

```plaintext
DISCORD_BOT_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key
BOTSPAM_CHANNEL_ID=your_botspam_channel_id
WELCOME_CHANNEL_ID=your_welcome_channel_id  # Required: Channel ID where welcome images are posted.
PROFILE_CHANNEL_ID=your_profile_channel_id  # Required: Channel ID where profile picture suggestions are posted.
WELCOME_PROMPT=Create a welcome image for a new Discord user with the username '{username}'. Incorporate the user's avatar into the image, its described as: {avatar}
WILDCARD=0
POSTING_DELAY=120  # Delay in seconds before posting the image to the welcome channel
WATERMARK_PATH=/usr/src/app/watermark.png  # Optional: Path to the watermark image that will be added to welcome images. If not set, no watermark will be added.
STEALTH_WELCOME=false  # Optional: Set to 'true' to enable stealth mode, making welcome messages in the welcome channel silent for everyone except the new user.
GENDER_SENSITIVITY=false # Optional: Set to 'true' to enable personalized touches for generated images based on gender-sensitive characteristics.
```

Note: Environment variables are never accessed directly in the code. Instead, they are assigned to constants using helper functions to ensure safe and consistent use throughout the codebase.

### Usage

#### Docker Run
To run the bot using Docker, use the following command:
```plaintext
docker run -d --name hello-dalle-discordbot --env-file .env heavygee/hello-dalle-discordbot
```

#### Docker Compose
Alternatively, use Docker Compose for a more robust setup. Create a `docker-compose.yml` file:

```plaintext
version: '3.8'
services:
  hello-dalle-discordbot:
    image: heavygee/hello-dalle-discordbot
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - BOTSPAM_CHANNEL_ID=${BOTSPAM_CHANNEL_ID}
      - WELCOME_CHANNEL_ID=${WELCOME_CHANNEL_ID}
      - PROFILE_CHANNEL_ID=${PROFILE_CHANNEL_ID}
      - WELCOME_PROMPT=${WELCOME_PROMPT}
      - WILDCARD=${WILDCARD}
      - POSTING_DELAY=${POSTING_DELAY}
      - WATERMARK_PATH=${WATERMARK_PATH}  # Optional: Path to watermark image
    env_file:
      - .env
    volumes:
      - ./welcome_images:/usr/src/app/welcome_images
```

This `volumes` directive ensures that the `welcome_images` directory on your host machine is bound to the corresponding directory inside the Docker container. This allows you to store generated images outside the container and access them easily.

Run the container using Docker Compose:
```plaintext
docker-compose up -d
```

### License
This project is licensed under the MIT License. See the LICENSE file for details.

### Authors
- **HeavyGee**
- **ChatGPT** (by OpenAI) - Chad wrote the whole damn thing.

### Support
For issues, please open an issue on the [GitHub repository](https://github.com/heavygee/hello-dalle-discordbot).
