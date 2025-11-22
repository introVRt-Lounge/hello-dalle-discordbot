# Cost Monitoring Setup Guide

This guide explains how to set up cost monitoring for the hello-dalle Discord bot, allowing it to display API usage costs at startup.

**Current Account Status:** Gemini cost monitoring is fully functional. OpenAI cost monitoring is accessible but returns $0.00 (no billing data available with current account permissions).

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

**⚠️ LIMITED AVAILABILITY - Account Dependent**

OpenAI provides usage and cost monitoring through their API, but availability depends on your account type and permissions:

### Available Endpoints
- `GET /v1/usage` - Usage data over date ranges (accessible but may return empty data)
- `GET /v1/dashboard/billing/subscription` - Subscription info (requires browser session, not API key)
- `GET /v1/dashboard/billing/credit_grants` - Credit balance info (may require special permissions)

### Current Account Status
Based on testing with the current OpenAI account:
- ✅ **Usage API accessible** but returns empty data (no billing information)
- ❌ **Billing Subscription API** requires browser authentication (401 Unauthorized)
- ✅ **Basic API connectivity** works (models, chat completions, etc.)

### Requirements
- API key with appropriate billing/usage permissions
- Account type that allows API access to billing data
- May require enterprise or special account configurations

### Limitations
- Most OpenAI accounts cannot access billing data via API
- Usage API may return empty data even when accessible
- Billing endpoints often require browser-based authentication
- Cost monitoring may show $0.00 even with working API access

## Environment Variables

Add these to your `.env` file:

```env
# Gemini Cost Monitoring (BigQuery)
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id

# OpenAI Cost Monitoring (optional - requires special permissions)
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
- **Gemini Lifetime**: Shows actual lifetime costs from BigQuery billing export
- **OpenAI Lifetime**: Shows $0.00 since we currently only query current month data (API supports historical data but not implemented)
- If OpenAI cost monitoring fails, it gracefully falls back and doesn't show OpenAI costs
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

### OpenAI Cost Monitoring

**"OpenAI cost monitoring not available"**
- OpenAI cost monitoring requires special API permissions that most accounts don't have
- Only available for enterprise accounts or accounts with special billing access
- If you see this message, your OpenAI account doesn't have the required permissions
- Cost monitoring will still work for Gemini API if configured
- Check your OpenAI account type and permissions if you need OpenAI cost monitoring

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
