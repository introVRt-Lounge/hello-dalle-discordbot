## Hello DALL-E DiscordBot

### Overview

The Discord DALL-E Bot leverages OpenAI's DALL-E model to generate welcome images for new members joining your Discord server. When a new member joins, the bot uses their avatar and a customizable prompt to create a unique welcome image, ensuring each member feels special.

### Features

- **Automated Welcome Messages**: Automatically generates and sends welcome images when new members join your server.
- **Customizable Prompts**: Use environment variables to customize the welcome message and image generation prompt.
- **Dynamic Avatar Description**: Utilizes GPT-4 Vision capabilities to describe user avatars dynamically.
- **Secure Configuration**: Environment variables ensure sensitive information like API keys and tokens are not included in the Docker image.
- **Wildcard Feature**: Introduces variability in the prompts with a configurable chance of using an alternate prompt (default is 0% / disabled. 99 is max for 99% likely).
- **Image Storage**: Saves generated welcome images to a `welcome_images` subfolder with filenames based on the username and timestamp.
- **Delay Feature**: Adds a configurable delay (default 2 minutes) before posting the welcome image to the `welcome` channel. The bot will inform users in `#botspam` about the delay.
- **Optional Watermark**: Optionally adds a watermark to the generated images. The watermark can be customized using an environment variable (`WATERMARK_PATH`). If not set, no watermark will be added.
- **Configurable Welcome and Profile Picture Channels**: Allows users to explicitly set channels for welcome messages and profile picture suggestions, using environment variables (`WELCOME_CHANNEL_ID` and `PROFILE_CHANNEL_ID`). The channels can be the same if preferred.

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
