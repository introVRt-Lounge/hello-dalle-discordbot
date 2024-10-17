# ![Logo](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/logo.png) Hello Dall-E Discord Bot

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
PROFILE_CHANNEL_ID=your_profile_channel_id  # Required: Channel ID where profile picture suggestions are posted.
WELCOME_PROMPT=Create a welcome image for a new Discord user with the username '{username}'. Incorporate the user's avatar into the image, its described as: {avatar}
WILDCARD=0
POSTING_DELAY=120  # Delay in seconds before posting the image to the welcome channel
WATERMARK_PATH=/usr/src/app/watermark.png  # Optional: path for a watermark image that will be added to welcome images. If not set, no watermark will be added. Add as a docker bind path to store the watermark image on your host.
STEALTH_WELCOME=false  # Optional: Set to 'true' to enable stealth mode, making welcome messages in the welcome channel silent for everyone except the new user.
GENDER_SENSITIVITY=false # Optional: Set to 'true' to enable personalized touches for generated images based on gender-sensitive characteristics.
```

### Running with Docker

For details on running this project with Docker, visit the [Docker Hub page](https://hub.docker.com/r/heavygee/hello-dalle-discordbot).

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

Using the bot incurs costs based on the usage of OpenAI's DALL-E APIs. Each welcome image generated costs approximately $0.03. Ensure you monitor your usage to manage costs effectively.

## Debugging and Control

### Botspam Channel

The "botspam" channel is a designated channel in your Discord server where your bots can post detailed logs, debug information, and other outputs. When we reference `#botspam`, it refers to this designated channel where your bots will "spam" you with updates and logs. You will need to specify the ID of your botspam channel in the `.env` file.

### Commands

- `!welcome <username>`: Manually trigger a welcome message for a specific user. This command should be used in the `#botspam` channel.

- `!wildcard <value>`: Set the wildcard chance to a specific value between 0 and 99. This command allows you to control the variability in the welcome prompts. This command should be used in the `#botspam` channel.

### Example Usage

```plaintext
!welcome JohnDoe
```

```plaintext
!wildcard 25
```

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/heavygee/hello-dalle-discordbot/blob/main/LICENSE) file for details.

## Authors

- **HeavyGee**
- **ChatGPT** (by OpenAI)

## Support

For issues, please open an issue on the [GitHub repository](https://github.com/heavygee/hello-dalle-discordbot).
