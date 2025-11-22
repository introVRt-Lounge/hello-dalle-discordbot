# Cost Monitoring Setup Guide

This guide explains how to set up cost monitoring for the hello-dalle Discord bot, allowing it to display API usage costs at startup.

## Overview

The bot can monitor costs for both Gemini (Google AI) and OpenAI APIs, displaying lifetime and monthly costs in the #botspam channel at startup.

## Gemini API Cost Monitoring

### Prerequisites
- Google Cloud Project with billing enabled
- Owner or Billing Admin role on the project
- BigQuery API enabled

### Setup Steps

#### 1. Enable BigQuery API
```bash
gcloud services enable bigquery.googleapis.com --project=YOUR_PROJECT_ID
```

#### 2. Create Billing Export to BigQuery
1. Go to [Google Cloud Console Billing](https://console.cloud.google.com/billing)
2. Select your billing account
3. Go to "Billing export" → "Create billing export"
4. Choose "BigQuery export"
5. Select your project and create a new dataset (e.g., `billing_data`)
6. Click "Create"

#### 3. Wait for Data Population
- **Initial setup**: May take 24-48 hours
- **Ongoing**: Data updates daily

#### 4. Verify Access
```bash
# Check if dataset exists
bq --project_id=YOUR_PROJECT_ID ls

# Test query (should return data if working)
bq --project_id=YOUR_PROJECT_ID query --use_legacy_sql=false "
SELECT COUNT(*) as records
FROM \`YOUR_PROJECT_ID.billing_data.gcp_billing_export_v1_*\`
WHERE DATE(_PARTITIONTIME) >= '2024-11-01'
LIMIT 1
"
```

### Gemini Cost Query Details
The bot queries for services matching:
- `generativelanguage.googleapis.com` (Gemini API)
- `aiplatform.googleapis.com` (Vertex AI, includes Gemini)

## OpenAI API Cost Monitoring

### Prerequisites
- OpenAI API key with billing access
- OpenAI organization with billing enabled

### Setup Steps

#### 1. Get API Key
- Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
- Create a new API key or use existing one
- **Important**: The API key must have billing/usage read permissions

#### 2. Set Environment Variable
```bash
export OPENAI_API_KEY=your_openai_api_key_here
```

#### 3. Verify Access
```bash
# Test API access (will implement cost checking)
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     "https://api.openai.com/v1/models"
```

### OpenAI Cost Access
OpenAI cost monitoring is implemented but requires special permissions:
- **Usage API**: Requires API key with billing read permissions (not all keys have this)
- **Subscription API**: Fallback endpoint for basic subscription info
- **Cost Estimation**: Calculates approximate costs from usage data when available
- **Permission Gating**: Many OpenAI API keys cannot access cost/usage data

## Environment Variables

Add these to your `.env` file:

```env
# Gemini Cost Monitoring (BigQuery)
# No additional env vars needed - uses existing GEMINI_API_KEY

# OpenAI Cost Monitoring
OPENAI_API_KEY=your_openai_api_key_here
```

## Bot Behavior

### Startup Cost Report
At bot restart, the bot will post to #botspam:

```
💰 Cost Report

Gemini API:
• This Month: $4.20 USD
• Lifetime: $12.80 USD

OpenAI API:
• This Month: $2.50 USD
• Lifetime: $8.90 USD

*Cost monitoring powered by hello-dalle* 🤖
```

### Cost Display Logic
- Only shows services with available cost data
- Shows "This Month" and "Lifetime" costs
- Handles missing data gracefully
- Non-blocking (won't delay bot startup)

## Troubleshooting

### Gemini Issues

**"Dataset not found"**
- Wait 24-48 hours after setting up billing export
- Verify dataset name in BigQuery console

**"Access denied"**
- Ensure you have Billing Admin role
- Check project ID is correct

**"No data returned"**
- Billing export may still be populating
- Check date range in queries

### OpenAI Issues

**"API key lacks permissions"**
- Most OpenAI API keys don't have billing access by default
- Requires special permissions from OpenAI/org admin
- This is normal - OpenAI restricts billing API access

**"Cost data not available"**
- OpenAI intentionally limits cost API access
- Only works if your API key has billing permissions
- Bot gracefully handles missing OpenAI cost data

## Security Considerations

- **API keys**: Store securely, never commit to repository
- **Billing data**: Contains sensitive cost information
- **Permissions**: Use principle of least privilege
- **Monitoring**: Regularly audit API access

## Cost Estimation

### Gemini API
- **Image generation**: ~$0.08 per image
- **Welcome images**: 1 API call each
- **PFP transformations**: 1 API call each

### OpenAI API
- **DALL-E 3**: ~$0.08-0.12 per image (varies by size/quality)
- **GPT usage**: Variable based on tokens

## Maintenance

### Regular Tasks
- Monitor API costs monthly
- Review billing alerts
- Update API keys before expiration
- Audit access permissions quarterly

### Cost Optimization
- Implement user rate limits
- Cache generated images
- Monitor usage patterns
- Set up billing alerts

## Support

For issues with cost monitoring setup:
1. Check Google Cloud Console for billing export status
2. Verify API key permissions
3. Review bot logs for error messages
4. Test queries manually before relying on bot
