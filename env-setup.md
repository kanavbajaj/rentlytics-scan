# Environment Setup for AI Recommendations

## Quick Setup

1. **Get Hugging Face API Key**
   - Visit: https://huggingface.co/settings/tokens
   - Sign up/login and create a new token
   - Copy the token

2. **Create Environment File**
   Create a file named `.env.local` in your project root:
   ```bash
   VITE_HUGGING_FACE_API_KEY=your_token_here
   ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Alternative: Use Without API Key

The system will automatically fall back to rule-based recommendations if no API key is provided, so the feature will still work!

## Test the Feature

1. Go to your dashboard
2. Look for "AI Vehicle Recommendation" section
3. Describe your needs (e.g., "I need a heavy excavator for construction at Site A")
4. Click "Get AI Recommendations"
5. See personalized vehicle suggestions with reasoning
