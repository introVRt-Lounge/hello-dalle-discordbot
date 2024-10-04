# ![Logo](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/logo.png) Hello Dall-E Discord Bot

This bot uses OpenAI's DALL-E to generate welcome images for new Discord members. It describes the user's avatar and generates an image based on a prompt. Additionally, for users without a profile pic, it will generate a profile pic based on their username and suggest the user adopt it.

## Features
- Automatically welcome new members with a custom image.
- Generate images using DALL-E and re-upload to Discord to avoid expiration.
- **Wildcard Feature**: Introduces variability in the prompts with a configurable chance of using an alternate prompt (default is 0% / disabled. 99 is max for 99% likely)
- **Image Storage**: Saves generated welcome images to a `welcome_images` subfolder with filenames based on the username and timestamp.
- **Delay Feature**: Configurable delay (default 2 minutes) before posting the welcome image to the `new-users` channel. The bot will inform admins in `#botspam` about the delay before the image is posted in `new-users`.

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
WELCOME_CHANNEL_NAME=new-users
GENERAL_CHANNEL_ID=your_general_channel_id
WELCOME_PROMPT=Create a welcome image for a new Discord user with the username '{username}'. Incorporate the users avatar into the image, its described as: {avatar}
WILDCARD=0
POSTING_DELAY=120  # Delay in seconds before posting the image to new-users
```
GENERAL_CHANNEL_ID: The ID of the general channel where the bot will suggest profile pictures to users without profile pictures.

### Running with Docker

For details on running this project with Docker, visit the [Docker Hub page](https://hub.docker.com/r/heavygee/hello-dalle-discordbot).

## Examples of Output

### Example welcome image in `#new-users`
![Example welcome image in #new-users](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/new-users-output.png)

### Example debug report in `#botspam`
![Example debug report in #botspam](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/botspam-output.png)

### Example WILDCARD welcome image in `#new-users`
![Example wildcard welcome image in #new-users](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/wildcard-output.png)

### Example WILDCARD debug report in `#botspam`
![Example wildcard debug report in #botspam](https://github.com/heavygee/hello-dalle-discordbot/blob/main/readme_images/wildcard-botspam-output.png)

## Cost

Using the bot incurs costs based on the usage of OpenAI's DALL-E API. Each welcome image generated costs approximately $0.03. Ensure you monitor your usage to manage costs effectively.

## Debugging and Control

### Botspam Channel

The "botspam" channel is a designated channel in your Discord server where your bots can post detailed logs, debug information, and other outputs. When we reference `#botspam`, it refers to this designated channel where your bots will "spam" you with updates and logs. You will need to specify the ID of your botspam channel in the `.env` file.

### Commands

- `!welcome <username>`: Manually trigger a welcome message for a specific user. This command should be used in the `#botspam` channel.

- `!wildcard <value>`: Set the wildcard chance to a specific value between 0 and 99. This command allows you to control the variability in the welcome prompts. This command should be used in the `#botspam` channel.

### Example Usage

```
!welcome JohnDoe
```

```
!wildcard 25
```

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/heavygee/hello-dalle-discordbot/blob/main/LICENSE) file for details.

## Authors

- **HeavyGee**
- **ChatGPT** (by OpenAI)

## Support

For issues, please open an issue on the [GitHub repository](https://github.com/heavygee/hello-dalle-discordbot).
