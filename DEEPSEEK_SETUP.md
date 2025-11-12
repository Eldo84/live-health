# DeepSeek AI Predictions Setup

## Overview

The AI Predictions feature uses DeepSeek's API to generate real-time predictions based on outbreak data. The system analyzes recent outbreak signals from the past 30 days and generates predictions about case forecasts, geographic spread, and risk assessments.

## Setup Instructions

### Step 1: Get DeepSeek API Key

1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (keep it secure!)

### Step 2: Deploy Edge Function

Deploy the `generate-ai-predictions` edge function to Supabase:

```bash
cd supabase/functions/generate-ai-predictions
supabase functions deploy generate-ai-predictions
```

Or using Supabase CLI with project reference:

```bash
supabase functions deploy generate-ai-predictions --project-ref YOUR_PROJECT_REF
```

### Step 3: Set Edge Function Secret

Set the DeepSeek API key as a secret in your Supabase Edge Function:

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Your Project
2. Navigate to **Edge Functions** → `generate-ai-predictions`
3. Click **Settings** tab
4. Scroll to **Secrets** section
5. Add new secret:
   - Key: `DEEPSEEK_API_KEY`
   - Value: `your_deepseek_api_key_here`

**Option B: Via Supabase CLI**
```bash
supabase secrets set DEEPSEEK_API_KEY=your_deepseek_api_key_here --project-ref YOUR_PROJECT_REF
```

### Step 4: Verify Setup

1. Navigate to the Dashboard in your app
2. Go to the **AI Predictions** tab
3. The component should automatically fetch predictions
4. If you see an error, check:
   - Edge function is deployed
   - `DEEPSEEK_API_KEY` secret is set correctly
   - You have outbreak signals in your database (last 30 days)

## How It Works

1. **Data Collection**: The edge function fetches recent outbreak signals (last 30 days) from the database
2. **Data Analysis**: Signals are grouped by disease and location to identify patterns
3. **AI Processing**: DeepSeek API analyzes the data and generates predictions
4. **Prediction Types**:
   - **Case Forecast**: Predicted number of cases in the near future
   - **Geographic Spread**: Probability of spread to neighboring regions
   - **Risk Assessment**: Risk level based on current conditions
   - **Timeline Projection**: Expected timeline for outbreak progression

## API Response Format

The edge function returns predictions in this format:

```json
{
  "predictions": [
    {
      "disease": "Ebola",
      "location": "Democratic Republic of Congo",
      "type": "Case Forecast",
      "prediction": "580 predicted cases in next 7 days",
      "confidence": 87,
      "riskLevel": "critical",
      "targetDate": "Nov 15, 2024",
      "color": "#f87171"
    }
  ]
}
```

## Troubleshooting

### "AI predictions are not configured"
- Make sure `DEEPSEEK_API_KEY` is set in Edge Function secrets
- Verify the secret name is exactly `DEEPSEEK_API_KEY` (case-sensitive)

### "No predictions available"
- Check if you have outbreak signals in the database from the last 30 days
- Verify the edge function has access to the database (service role key is set)

### "Failed to fetch predictions"
- Check Edge Function logs in Supabase Dashboard
- Verify the DeepSeek API key is valid and has credits
- Check network connectivity

### Edge Function Logs
View logs in Supabase Dashboard:
1. Go to **Edge Functions** → `generate-ai-predictions`
2. Click **Logs** tab
3. Look for errors or execution details

## Cost Considerations

- DeepSeek API charges based on token usage
- Each prediction generation uses approximately 1000-2000 tokens
- Monitor your DeepSeek account for usage and billing
- Consider caching predictions to reduce API calls

## Security Notes

- Never commit API keys to version control
- Use Supabase Edge Function secrets for secure storage
- The API key is only accessible server-side (in the edge function)
- Frontend never sees or stores the API key

