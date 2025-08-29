import { Client, EmbedBuilder } from 'discord.js';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { Logger } from '../utils/log.js';

type ReleaseInfo = any;

export class ReleaseAnnouncer {
  private octokit: Octokit;
  private openai?: OpenAI;
  private repoOwner: string;
  private repoName: string;

  constructor(
    githubToken: string,
    repoOwner: string = 'introVRt-Lounge',
    repoName: string = 'hello-dalle-discordbot',
    openaiApiKey?: string
  ) {
    this.octokit = new Octokit({ auth: githubToken });
    this.repoOwner = repoOwner;
    this.repoName = repoName;

    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  private async summarizeReleaseNotes(notes: string): Promise<string> {
    if (!notes) {
      return "No release notes provided.";
    }

    if (!this.openai) {
      Logger.warn("OpenAI API key not found, returning full release notes.");
      return notes;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes GitHub release notes into a short, user-friendly announcement."
          },
          {
            role: "user",
            content: `Summarize the following release notes:\n\n${notes}`
          }
        ]
      });

      return response.choices[0].message.content || notes;
    } catch (error) {
      Logger.error(`Error summarizing release notes: ${error}`);
      return notes;
    }
  }

  private async getLatestRelease(): Promise<ReleaseInfo | null> {
    try {
      const response = await this.octokit.repos.getLatestRelease({
        owner: this.repoOwner,
        repo: this.repoName
      });

      Logger.info("Successfully fetched latest release from GitHub.");
      return response.data;
    } catch (error) {
      Logger.error(`Failed to fetch latest release from GitHub: ${error}`);
      return null;
    }
  }

  public async checkAndAnnounceNewRelease(
    client: Client,
    channelId: string,
    lastAnnouncedTag: string | null
  ): Promise<string | null> {
    Logger.info("Checking for new releases...");

    const latestRelease = await this.getLatestRelease();
    if (!latestRelease) {
      Logger.warning("No latest release found on GitHub.");
      return null;
    }

    const latestTag = latestRelease.tag_name;
    Logger.info(`Latest release tag found on GitHub: ${latestTag}`);

    if (lastAnnouncedTag) {
      Logger.info(`Last announced release from DB: ${lastAnnouncedTag}`);
    } else {
      Logger.info("No previous announcement found in DB");
    }

    if (latestTag !== lastAnnouncedTag) {
      Logger.info(`New release ${latestTag} found. Will announce...`);

      await this.announceRelease(client, channelId, latestRelease);
      Logger.info(`Set last announced release to ${latestTag}`);
      return latestTag;
    } else {
      Logger.info(`Release ${latestTag} has already been announced. Skipping.`);
      return null;
    }
  }

  private async announceRelease(
    client: Client,
    channelId: string,
    release: ReleaseInfo
  ): Promise<void> {
    const channel = client.channels.cache.get(channelId);
    if (!channel || !('send' in channel)) {
      Logger.error(`Channel with ID ${channelId} not found or not a text channel.`);
      return;
    }

    const summary = await this.summarizeReleaseNotes(release.body || '');

    const embed = new EmbedBuilder()
      .setTitle(`🚀 New Release: ${release.name || release.tag_name}`)
      .setDescription(summary)
      .setColor(0x00FF00)
      .setURL(release.html_url)
      .addFields(
        { name: "Version", value: release.tag_name, inline: true },
        { name: "Published At", value: release.published_at, inline: true }
      );

    await channel.send({ embeds: [embed] });
    Logger.info(`Successfully announced release ${release.tag_name} to channel ${channelId}.`);
  }
}
