import { Client, TextChannel } from 'discord.js';
import { BOTSPAM_CHANNEL_ID, GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT_ID } from '../config';
import { execSync } from 'child_process';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface CostData {
  service: 'gemini' | 'openai';
  lifetime: number;
  thisMonth: number;
  currency: string;
}

export class CostMonitoringService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Get cost data from all available services
   */
  async getAllCosts(): Promise<CostData[]> {
    const costs: CostData[] = [];

    // Get Gemini costs if BigQuery access is available
    try {
      const geminiCost = await this.getGeminiCosts();
      if (geminiCost) {
        costs.push(geminiCost);
      }
    } catch (error) {
      console.warn('Failed to get Gemini costs:', error);
    }

    // Note: OpenAI cost monitoring is not available via public API
    // OpenAI removed their public usage endpoints, so we cannot monitor OpenAI costs
    console.log('OpenAI cost monitoring not available - OpenAI removed public usage API endpoints');

    return costs;
  }

  /**
   * Send cost report to botspam channel
   */
  async sendCostReport(): Promise<void> {
    try {
      const costs = await this.getAllCosts();

      if (costs.length === 0) {
        console.log('No cost data available - cost monitoring not configured');
        return;
      }

      const channel = this.client.channels.cache.get(BOTSPAM_CHANNEL_ID) as TextChannel;
      if (!channel) {
        console.warn('Botspam channel not found for cost reporting');
        return;
      }

      let message = '💰 **Cost Report**\n\n';

      for (const cost of costs) {
        const serviceName = cost.service === 'gemini' ? 'Gemini API' : 'OpenAI API';
        message += `**${serviceName}:**\n`;
        message += `• This Month: $${cost.thisMonth.toFixed(2)} ${cost.currency}\n`;
        message += `• Lifetime: $${cost.lifetime.toFixed(2)} ${cost.currency}\n\n`;
      }

      message += '*Cost monitoring powered by hello-dalle* 🤖';

      await channel.send(message);
      console.log('Cost report sent to botspam channel');

    } catch (error) {
      console.error('Failed to send cost report:', error);
    }
  }

  /**
   * Get Gemini API costs from BigQuery billing export
   */
  private async getGeminiCosts(): Promise<CostData | null> {
    if (!GEMINI_API_KEY || !GOOGLE_CLOUD_PROJECT_ID) {
      return null;
    }

    try {
      // Query BigQuery for Gemini costs
      const query = `
        SELECT
          SUM(cost) as total_cost,
          EXTRACT(YEAR FROM DATE(_PARTITIONTIME)) = EXTRACT(YEAR FROM CURRENT_DATE()) AND EXTRACT(MONTH FROM DATE(_PARTITIONTIME)) = EXTRACT(MONTH FROM CURRENT_DATE()) as is_current_month
        FROM \`${GOOGLE_CLOUD_PROJECT_ID}.billing_data.gcp_billing_export_v1_*\`
        WHERE
          service.description LIKE '%Generative%'
          OR service.description LIKE '%Vertex AI%'
        GROUP BY is_current_month
        ORDER BY is_current_month DESC
      `;

      const result = execSync(`bq --project_id=${GOOGLE_CLOUD_PROJECT_ID} query --use_legacy_sql=false "${query}" --format=csv`, {
        encoding: 'utf8',
        timeout: 30000
      });

      // Parse CSV result with improved error handling
      const lines = result.trim().split('\n');
      if (lines.length < 2) {
        console.warn('BigQuery returned insufficient data for cost analysis');
        return null;
      }

      let lifetimeCost = 0;
      let thisMonthCost = 0;

      // Skip header row and process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        // Split on comma and trim each field
        const fields = line.split(',').map(field => field.trim());

        if (fields.length !== 2) {
          console.warn(`Skipping malformed CSV line ${i}: ${line}`);
          continue;
        }

        const [costStr, isCurrentMonthStr] = fields;
        const costValue = parseFloat(costStr);

        if (isNaN(costValue)) {
          console.warn(`Invalid cost value on line ${i}: ${costStr}`);
          continue;
        }

        const isCurrentMonth = isCurrentMonthStr === 'true';

        if (isCurrentMonth) {
          thisMonthCost += costValue;
        }
        lifetimeCost += costValue;
      }

      if (lifetimeCost === 0) {
        console.warn('No valid cost data found in BigQuery results');
        return null;
      }

      return {
        service: 'gemini',
        lifetime: Math.abs(lifetimeCost),
        thisMonth: Math.abs(thisMonthCost),
        currency: 'USD'
      };

    } catch (error) {
      console.warn('Gemini cost query failed:', error);
      return null;
    }
  }

}
