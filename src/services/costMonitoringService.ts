import { Client, TextChannel } from 'discord.js';
import { BOTSPAM_CHANNEL_ID, OPENAI_API_KEY, GEMINI_API_KEY } from '../config';
import { execSync } from 'child_process';

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

    // Get OpenAI costs if API key is available
    try {
      const openaiCost = await this.getOpenAICosts();
      if (openaiCost) {
        costs.push(openaiCost);
      }
    } catch (error) {
      console.warn('Failed to get OpenAI costs:', error);
    }

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
    if (!GEMINI_API_KEY) {
      return null;
    }

    try {
      // Query BigQuery for Gemini costs
      const query = `
        SELECT
          SUM(cost) as total_cost,
          EXTRACT(MONTH FROM DATE(_PARTITIONTIME)) = EXTRACT(MONTH FROM CURRENT_DATE()) as is_current_month
        FROM \`gen-lang-client-0897480548.billing_data.gcp_billing_export_v1_*\`
        WHERE
          service.description LIKE '%Generative%'
          OR service.description LIKE '%Vertex AI%'
        GROUP BY is_current_month
        ORDER BY is_current_month DESC
      `;

      const result = execSync(`bq --project_id=gen-lang-client-0897480548 query --use_legacy_sql=false "${query}" --format=csv`, {
        encoding: 'utf8',
        timeout: 30000
      });

      // Parse CSV result
      const lines = result.trim().split('\n');
      if (lines.length < 2) {
        return null;
      }

      let lifetimeCost = 0;
      let thisMonthCost = 0;

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const [cost, isCurrentMonth] = lines[i].split(',');
        const costValue = parseFloat(cost) || 0;

        if (isCurrentMonth === 'true') {
          thisMonthCost = costValue;
        }
        lifetimeCost += costValue;
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

  /**
   * Get OpenAI API costs from OpenAI usage API
   */
  private async getOpenAICosts(): Promise<CostData | null> {
    if (!OPENAI_API_KEY) {
      return null;
    }

    try {
      // OpenAI cost monitoring would require their billing API
      // For now, return null as we don't have billing API access
      console.log('OpenAI cost monitoring not yet implemented - requires billing API access');
      return null;

    } catch (error) {
      console.warn('OpenAI cost query failed:', error);
      return null;
    }
  }
}
