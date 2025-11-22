import { Client, TextChannel } from 'discord.js';
import { BOTSPAM_CHANNEL_ID, OPENAI_API_KEY, GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT_ID } from '../config';
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

  /**
   * Get OpenAI API costs from OpenAI usage API
   */
  private async getOpenAICosts(): Promise<CostData | null> {
    if (!OPENAI_API_KEY) {
      return null;
    }

    try {
      // Try to get usage data from OpenAI
      // Note: This requires appropriate permissions on the API key
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // First day of current month
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // Last day of current month

      // Get usage for current month
      const usageResponse = await axios.get('https://api.openai.com/v1/usage', {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
          end_date: endDate.toISOString().split('T')[0]
        },
        timeout: 10000
      });

      if (usageResponse.data && usageResponse.data.data) {
        // Calculate costs based on usage data
        // OpenAI provides usage counts, we need to estimate costs
        let monthlyCost = 0;
        let lifetimeCost = 0;

        for (const usage of usageResponse.data.data) {
          // Rough cost estimation based on model usage
          // DALL-E 3: ~$0.08-0.12 per image
          // GPT models: variable based on tokens
          if (usage.model?.includes('dall-e')) {
            monthlyCost += (usage.n || 0) * 0.10; // Estimate $0.10 per DALL-E image
          } else if (usage.model?.includes('gpt')) {
            // Rough estimate for GPT usage
            monthlyCost += (usage.total_tokens || 0) * 0.000002; // ~$0.002 per 1000 tokens
          }
        }

        // Note: OpenAI API supports historical data via date parameters,
        // but we currently only query current month for simplicity and rate limiting
        // Lifetime data could be implemented by querying from account creation date
        // For now, we only report current month costs

        return {
          service: 'openai',
          lifetime: 0, // We don't have lifetime data available
          thisMonth: Math.abs(monthlyCost),
          currency: 'USD'
        };
      }

      // If usage API fails or no permissions, try subscription endpoint
      console.warn('OpenAI usage API not accessible, trying subscription endpoint');
      return await this.getOpenAISubscriptionCosts();

    } catch (error) {
      console.warn('OpenAI usage API failed, trying subscription endpoint:', error instanceof Error ? error.message : String(error));

      // Fallback to subscription endpoint
      try {
        return await this.getOpenAISubscriptionCosts();
      } catch (fallbackError) {
        console.warn('OpenAI cost monitoring not available:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
        return null;
      }
    }
  }

  /**
   * Fallback: Get basic OpenAI subscription info (not actual costs)
   */
  private async getOpenAISubscriptionCosts(): Promise<CostData | null> {
    try {
      const subscriptionResponse = await axios.get('https://api.openai.com/v1/dashboard/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (subscriptionResponse.data) {
        // This gives subscription info but not actual usage costs
        // We can only show that OpenAI monitoring is configured but costs are not available
        console.log('OpenAI subscription accessible but cost details not available via API');
        return null; // Return null since we can't get actual costs
      }

    } catch (error) {
      // Subscription endpoint also failed
      console.warn('OpenAI subscription endpoint also failed');
    }

    return null;
  }
}
