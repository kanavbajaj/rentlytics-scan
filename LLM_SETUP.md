# LLM Vehicle Recommendation Setup

This guide explains how to set up the AI-powered vehicle recommendation feature in your CAT Equipment Hub dashboard.

## Features

The AI recommendation system analyzes user requirements and suggests the most suitable available vehicles from your database. It considers:

- Equipment type (excavator, bulldozer, crane, truck, forklift)
- Capacity requirements (light, heavy, specific tonnage)
- Location preferences (Site A, B, C, warehouses)
- Fuel type preferences (diesel, electric)
- Project type (construction, warehouse, transport)

## Setup Instructions

### 1. Get a Free Hugging Face API Key

1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
2. Create an account or sign in
3. Click "New token"
4. Give it a name (e.g., "CAT Equipment Hub")
5. Select "Read" permissions
6. Copy the generated token

### 2. Configure Environment Variables

Create a `.env.local` file in your project root and add:

```bash
VITE_HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
```

### 3. Restart Your Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
# or
yarn dev
```

## How It Works

### AI-Powered Recommendations
- Uses Hugging Face's DialoGPT-medium model
- Analyzes natural language requirements
- Provides reasoning for each recommendation
- Scores vehicles from 1-10 based on match quality

### Fallback System
- If the LLM is unavailable, falls back to rule-based recommendations
- Ensures the feature always works
- Provides consistent scoring and reasoning

### Smart Matching
The system understands various requirement formats:
- "I need a heavy excavator for construction at Site A"
- "Looking for electric forklift for warehouse operations"
- "Need truck for hauling materials"

## API Usage

The system uses Hugging Face's free inference API with:
- Rate limits: Generous free tier
- Model: Microsoft DialoGPT-medium
- Response time: Typically 2-5 seconds
- Fallback: Automatic if API fails

## Troubleshooting

### API Key Issues
- Ensure the key is correctly copied
- Check that the environment variable is loaded
- Verify the key has proper permissions

### No Recommendations
- Check browser console for errors
- Verify vehicles exist in the database
- Ensure vehicles are marked as available (not rented)

### Slow Responses
- The LLM may take a few seconds to respond
- Consider using the rule-based fallback for faster results

## Customization

You can modify the recommendation logic by editing:
- `VehicleRecommendation.tsx` - Main component logic
- `createRuleBasedRecommendations()` - Fallback algorithm
- Prompt engineering for better LLM responses

## Security Notes

- API keys are stored client-side (Vite environment variables)
- Keys are only used for vehicle recommendations
- No sensitive data is sent to external APIs
- Consider rate limiting for production use
