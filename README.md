# ![Logo](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/logo.png) Hello Dall-E Discord Bot

# 🚫 **PRODUCTION DEPLOYMENT WARNING**

**⚠️ THIS REPOSITORY IS FOR DEVELOPMENT AND CI/CD ONLY**

**DO NOT ATTEMPT TO BUILD OR RUN PRODUCTION CONTAINERS FROM THIS DIRECTORY**

**Production deployment happens automatically via GitHub Actions → Docker Hub → Watchtower**

📖 **Read:** [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for complete deployment information

---

This bot uses OpenAI's DALL-E to generate welcome images for new Discord members. It describes the user's avatar and generates an image based on a prompt. Additionally, for users without a profile pic, it will generate a profile pic based on their username and suggest the user adopt it.

## Features
- **Welcome Images for New Members**: Automatically generates and sends a welcome image when new members join your server.
- **Profile Picture Suggestion for New Members Without an Avatar**: For users without a profile picture, the bot will create one based on their username and suggest it as their profile picture.
- **Gender Sensitivity Option**: Attempts to add personalized touches to generated images based on very limited perceivable characteristics. This is an optional feature, designed to make generated images more accurate. This feature must be explicitly enabled using an environment variable (`GENDER_SENSITIVITY`).
- **Image Generation**: Uses OpenAI's DALL-E to generate images and re-uploads them to Discord to avoid expiration.
- **Wildcard Feature**: Introduces variability in the prompts with a configurable chance of using an alternate prompt (default is 0% / disabled. 99 is max for 99% likely).
- **Image Storage**: Saves generated welcome images to a `welcome_images` subfolder with filenames based on the username and timestamp.
- **Delay Feature**: Configurable delay (default 2 minutes) before posting the welcome image to the `welcome` channel. The bot will inform admins in `#botspam` about the delay before the image is posted.
- **Stealth Welcome Messages**: Optionally configure the bot to post welcome messages in the `welcome` channel as silent messages, notifying only the new user without pinging everyone else. This can be controlled via the `STEALTH_WELCOME` environment variable.
- **Configurable Channels**: Allows specifying different channels for welcome images (`WELCOME_CHANNEL_ID`) and profile picture suggestions (`PROFILE_CHANNEL_ID`). These channels can be the same, at the user's discretion.

## Installation

### Prerequisites
- Node.js
- Docker (optional)

### Environment Variables
Create a `.env` file in the root of your project with the following variables:

```plaintext
DISCORD_BOT_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key
BOTSPAM_CHANNEL_ID=your_botspam_channel_id
WELCOME_CHANNEL_ID=your_welcome_channel_id  # Required: Channel ID where welcome images are posted.
PROFILE_CHANNEL_ID=your_profile_channel_id  # Required: Channel ID where profile picture suggestions are posted (typically #general).
BOT_USER_ROLE=your_bot_user_role_id  # Required: Role ID that allows users to use the /pfp command.
WELCOME_PROMPT=Create a welcome image for a new Discord user with the username '{username}'. Incorporate the user's avatar into the image, its described as: {avatar}
WILDCARD=0
POSTING_DELAY=120  # Delay in seconds before posting the image to the welcome channel
WATERMARK_PATH=/usr/src/app/watermark.png

# Optional: Google Gemini for alternative image generation
GEMINI_API_KEY=your_gemini_api_key  # Optional: Enables Gemini image generation as alternative to DALL-E

STEALTH_WELCOME=false  # Optional: Set to 'true' to enable stealth mode, making welcome messages in the welcome channel silent for everyone except the new user.
GENDER_SENSITIVITY=false # Optional: Set to 'true' to enable personalized touches for generated images based on gender-sensitive characteristics.
```

### Running with Docker

For details on running this project with Docker, visit the [Docker Hub page](https://hub.docker.com/r/heavygee/hello-dalle-discordbot).

## Image Generation Engines

This bot supports two image generation engines:

### DALL-E (Default)
- Uses OpenAI's DALL-E 3 model
- High-quality, consistent results
- Requires OpenAI API key with credits

### Google Gemini (Optional)
- Uses Google's Gemini models for high-accuracy avatar transformations
- Supports both text-to-image and **image-to-image** generation
- Higher cost (~$0.08/image due to double API calls) but more accurate results
- Requires `GEMINI_API_KEY` environment variable

📖 **Detailed Flow Documentation**: [IMAGE-GENERATION-FLOWS.md](IMAGE-GENERATION-FLOWS.md) - Complete technical documentation with flowcharts showing how DALL-E and Gemini differ in production

#### Gemini Features
- **Text-to-Image**: Generate images from text prompts
- **Image-to-Image**: Transform existing images (welcome images use actual user avatars)
- **PFP Enhancement**: Use `use-existing-pfp` flag to transform user's current Discord avatar
- **High Accuracy**: Most accurate avatar transformations using double-LLM analysis

#### Gemini Commands
```bash
# Use Gemini for text-to-image
/pfp Make me look like a cyberpunk hacker engine:gemini

# Use Gemini with existing avatar transformation
/pfp Transform my avatar into something magical use-existing-pfp engine:gemini

# Welcome command with Gemini (uses actual user avatar)
/welcome username:testuser engine:gemini
```

## Examples of Output

### Example welcome image in `welcome` channel
![Example welcome image in `welcome` channel](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/new-users-output.png)

### Example debug report in `#botspam`
![Example debug report in `#botspam`](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/botspam-output.png)

### Example WILDCARD welcome image in `welcome` channel
![Example wildcard welcome image in `welcome` channel](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/wildcard-output.png)

### Example WILDCARD debug report in `#botspam`
![Example wildcard debug report in `#botspam`](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/wildcard-botspam-output.png)

## Cost

### DALL-E (Default)
Using DALL-E incurs costs based on OpenAI's API pricing. Standard 1024×1024 images cost approximately **$0.04 per image**. Monitor your OpenAI usage dashboard to manage costs effectively.

### Google Gemini (Optional)
- **Pricing**: ~$0.08 per image (due to double API calls: text analysis + image generation)
- **Higher Cost**: More expensive than DALL-E but provides superior avatar transformation accuracy
- **Best For**: When image quality and personalization are more important than cost

Choose Gemini when you need the most accurate results based on users' actual profile pictures.

## Debugging and Control

### Botspam Channel

The "botspam" channel is a designated channel in your Discord server where your bots can post detailed logs, debug information, and other outputs. When we reference `#botspam`, it refers to this designated channel where your bots will "spam" you with updates and logs. You will need to specify the ID of your botspam channel in the `.env` file.

### Slash Commands

The bot now uses modern Discord slash commands (`/`) instead of the old `!` commands. The bot recognizes the following slash commands:

#### Profile Picture Commands

- `/pfp username:<username> [override:<custom_prompt>] [engine:<engine_choice>] [use-existing-pfp:<true/false>]`: Generates a profile picture suggestion for a specific user. Can be used in `#botspam`, `#welcome`, or `#general` channels. Requires admin privileges or the designated role ID (set in `BOT_USER_ROLE`) unless `/pfp-anyone` is enabled. **Username field has autocomplete support.**
  - `username`: The username of the user to generate a profile picture for (required)
  - `override`: Custom prompt to use instead of the default username-based prompt (optional)
  - `engine`: Override the default image generation engine for this command (optional)
  - `use-existing-pfp`: Transform the user's current Discord avatar instead of generating from scratch (optional, works with both DALL-E and Gemini)

**Note**: The old `!pfp` command is deprecated and no longer supported. Use `/pfp` instead.

- `/pfp-anyone`: Toggles whether regular users can use the `/pfp` command. Only works in the `#botspam` channel. Admin command only.

#### Welcome Commands

- `/welcome username:<username> destination:<channel> [engine:<engine_choice>]`: Manually trigger a welcome message for a specific user. Requires admin privileges or the designated role ID (set in `BOT_USER_ROLE`). **Username field has autocomplete support.**
  - `username`: The username of the user to welcome (required)
  - `destination`: Where to send the welcome message (required)
    - `Welcome Channel (Default)`: Posts to the configured welcome channel
    - `Botspam Channel (Debug/Test)`: Posts to botspam channel for testing/debugging
  - `engine`: Override the default image generation engine for this command (optional)

#### Configuration Commands

- `/wildcard value:<number>`: Set the wildcard chance to a specific value between 0 and 99. This command allows you to control the variability in the welcome prompts. Only works in the `#botspam` channel.
- `/engine engine:<choice>`: Set the default image generation engine to either "DALL-E (OpenAI)" or "Gemini (Google)". This affects all image generation when no specific engine is specified in commands. Only works in the `#botspam` channel.

### Example Usage

```plaintext
/pfp username: JohnDoe
/pfp username: JohnDoe override: a futuristic cyborg with glowing blue eyes
/pfp username: JohnDoe engine: Gemini (Google)
/pfp username: JohnDoe use-existing-pfp: true engine: Gemini (Google)
/pfp username: JaneSmith use-existing-pfp: true engine: DALL-E (OpenAI)
/pfp-anyone
/welcome username: JaneSmith destination: Welcome Channel (Default)
/welcome username: JaneSmith destination: Welcome Channel (Default) engine: DALL-E (OpenAI)
/wildcard value: 25
/engine engine: Gemini (Google)
```

### Autocomplete Feature

The `/pfp` and `/welcome` commands now include **autocomplete functionality** for the username parameter. When you type `/welcome username:` or `/pfp username:`, Discord will show a dropdown list of all server members that match what you've typed so far. This makes it much easier to find and select the correct user without having to remember exact usernames.

The autocomplete searches through both usernames and display names, so you can find users more easily.

### Migration from Old Commands

The bot has been converted from using `!` commands to modern Discord slash commands. The old `!` commands are no longer supported. Users should now use the `/` commands instead for better Discord integration, auto-completion, and help text.

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/heavygee/hello-dalle-discordbot/blob/main/LICENSE) file for details.

## Authors

- **HeavyGee**
- **ChatGPT** (by OpenAI)

## Support

For issues, please open an issue on the [GitHub repository](https://github.com/heavygee/hello-dalle-discordbot).
