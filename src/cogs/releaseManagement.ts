import { Client } from 'discord.js';
import { ReleaseAnnouncer } from '../services/releaseAnnouncer.js';
import { Logger } from '../utils/log.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export class ReleaseManagement {
  private client: Client;
  private announcer?: ReleaseAnnouncer;
  private lastAnnouncedTag: string | null = null;
  private dataFile: string;

  constructor(client: Client) {
    this.client = client;
    this.dataFile = join(process.cwd(), 'data', 'lastAnnouncedRelease.json');

    this.initializeAnnouncer();
    this.loadLastAnnouncedRelease();
  }

  private initializeAnnouncer(): void {
    const githubToken = process.env.GITHUB_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!githubToken) {
      Logger.warning("GITHUB_TOKEN not set. Release announcer disabled.");
      return;
    }

    this.announcer = new ReleaseAnnouncer(
      githubToken,
      'introVRt-Lounge',
      'hello-dalle-discordbot',
      openaiApiKey
    );

    Logger.info("Release announcer initialized successfully.");
  }

  private loadLastAnnouncedRelease(): void {
    try {
      const data = readFileSync(this.dataFile, 'utf8');
      const parsed = JSON.parse(data);
      this.lastAnnouncedTag = parsed.lastAnnouncedTag || null;
      Logger.info(`Loaded last announced release: ${this.lastAnnouncedTag || 'none'}`);
    } catch (error) {
      Logger.info("No previous announcement data found, starting fresh.");
      this.lastAnnouncedTag = null;
    }
  }

  private saveLastAnnouncedRelease(tag: string): void {
    try {
      const data = { lastAnnouncedTag: tag };
      writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      Logger.info(`Saved last announced release: ${tag}`);
    } catch (error) {
      Logger.error(`Failed to save last announced release: ${error}`);
    }
  }

  public async checkForNewReleases(): Promise<void> {
    if (!this.announcer) {
      Logger.debug("Release announcer not initialized, skipping check.");
      return;
    }

    const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;
    if (!notificationChannelId) {
      Logger.warning("NOTIFICATION_CHANNEL_ID not set, cannot announce releases.");
      return;
    }

    try {
      const newTag = await this.announcer.checkAndAnnounceNewRelease(
        this.client,
        notificationChannelId,
        this.lastAnnouncedTag
      );

      if (newTag) {
        this.lastAnnouncedTag = newTag;
        this.saveLastAnnouncedRelease(newTag);
      }
    } catch (error) {
      Logger.error(`Error checking for new releases: ${error}`);
    }
  }

  public getLastAnnouncedTag(): string | null {
    return this.lastAnnouncedTag;
  }

  public setLastAnnouncedTag(tag: string): void {
    this.lastAnnouncedTag = tag;
    this.saveLastAnnouncedRelease(tag);
  }
}
