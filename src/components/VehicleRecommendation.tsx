import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Car, MapPin, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  type: string;
  name: string;
  capacity: string;
  is_rented: boolean;
  location: string;
  fuel_type: string;
}

interface VehicleRecommendationProps {
  availableVehicles: Vehicle[];
}

interface Recommendation {
  vehicle: Vehicle;
  reasoning: string;
  matchScore: number;
}

const VehicleRecommendation = ({ availableVehicles }: VehicleRecommendationProps) => {
  const [userRequirements, setUserRequirements] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Using Hugging Face Inference API (free tier available)
  const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  
  // You can get a free API key from https://huggingface.co/settings/tokens
  const HUGGING_FACE_API_KEY = import.meta.env.VITE_HUGGING_FACE_API_KEY || '';

  const analyzeRequirements = async () => {
    if (!userRequirements.trim()) {
      toast({
        title: "Error",
        description: "Please describe your requirements first",
        variant: "destructive",
      });
      return;
    }

    if (!HUGGING_FACE_API_KEY) {
      toast({
        title: "API Key Required",
        description: "Please set VITE_HUGGING_FACE_API_KEY in your environment variables",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create a prompt for the LLM to analyze requirements and match vehicles
      const prompt = `Analyze the following construction equipment rental requirements and recommend the best available vehicles:

User Requirements: ${userRequirements}

Available Vehicles:
${availableVehicles.map(v => `- ${v.name} (${v.type}, ${v.capacity}, ${v.location}, ${v.fuel_type})`).join('\n')}

Please analyze the requirements and recommend the top 3 most suitable vehicles with reasoning. Consider:
1. Equipment type needed for the job
2. Capacity requirements
3. Location convenience
4. Fuel type preferences
5. Overall suitability

Format your response as a JSON array with objects containing:
- vehicleId: the vehicle ID
- reasoning: why this vehicle is recommended
- matchScore: a score from 1-10 indicating how well it matches requirements

Response:`;

      const response = await fetch(HUGGING_FACE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 500,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the LLM response and create recommendations
      const llmResponse = data[0]?.generated_text || '';
      
      // Fallback to rule-based recommendations if LLM parsing fails
      const fallbackRecommendations = createRuleBasedRecommendations(userRequirements, availableVehicles);
      
      // Try to parse LLM response, fallback to rule-based if needed
      let parsedRecommendations: Recommendation[] = [];
      try {
        // Extract JSON from LLM response if possible
        const jsonMatch = llmResponse.match(/\[.*\]/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedRecommendations = parsed.map((rec: any) => {
            const vehicle = availableVehicles.find(v => v.id === rec.vehicleId);
            return vehicle ? {
              vehicle,
              reasoning: rec.reasoning,
              matchScore: rec.matchScore
            } : null;
          }).filter(Boolean);
        }
      } catch (e) {
        console.log('LLM parsing failed, using fallback recommendations');
      }

      // Use LLM recommendations if available, otherwise use fallback
      const finalRecommendations = parsedRecommendations.length > 0 
        ? parsedRecommendations 
        : fallbackRecommendations;

      setRecommendations(finalRecommendations);
      
      toast({
        title: "Success",
        description: `Generated ${finalRecommendations.length} vehicle recommendations`,
      });

    } catch (error: any) {
      console.error('LLM API error:', error);
      
      // Fallback to rule-based recommendations
      const fallbackRecommendations = createRuleBasedRecommendations(userRequirements, availableVehicles);
      setRecommendations(fallbackRecommendations);
      
      toast({
        title: "LLM Unavailable",
        description: "Using rule-based recommendations instead",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRuleBasedRecommendations = (requirements: string, vehicles: Vehicle[]): Recommendation[] => {
    const lowerRequirements = requirements.toLowerCase();
    const recommendations: Recommendation[] = [];

    vehicles.forEach(vehicle => {
      let score = 5; // Base score
      let reasoning = '';

      // Type matching
      if (lowerRequirements.includes('excavator') && vehicle.type === 'excavator') {
        score += 3;
        reasoning += 'Excavator specifically requested. ';
      } else if (lowerRequirements.includes('bulldozer') && vehicle.type === 'bulldozer') {
        score += 3;
        reasoning += 'Bulldozer specifically requested. ';
      } else if (lowerRequirements.includes('crane') && vehicle.type === 'crane') {
        score += 3;
        reasoning += 'Crane specifically requested. ';
      } else if (lowerRequirements.includes('truck') && vehicle.type === 'truck') {
        score += 3;
        reasoning += 'Truck specifically requested. ';
      } else if (lowerRequirements.includes('forklift') && vehicle.type === 'forklift') {
        score += 3;
        reasoning += 'Forklift specifically requested. ';
      }

      // Capacity matching
      if (lowerRequirements.includes('heavy') || lowerRequirements.includes('large')) {
        if (parseInt(vehicle.capacity) > 30) {
          score += 2;
          reasoning += 'Heavy capacity equipment needed. ';
        }
      } else if (lowerRequirements.includes('small') || lowerRequirements.includes('light')) {
        if (parseInt(vehicle.capacity) < 20) {
          score += 2;
          reasoning += 'Light capacity equipment suitable. ';
        }
      }

      // Location matching
      if (lowerRequirements.includes('site a') && vehicle.location === 'Site A') {
        score += 2;
        reasoning += 'Located at requested site. ';
      } else if (lowerRequirements.includes('site b') && vehicle.location === 'Site B') {
        score += 2;
        reasoning += 'Located at requested site. ';
      } else if (lowerRequirements.includes('site c') && vehicle.location === 'Site C') {
        score += 2;
        reasoning += 'Located at requested site. ';
      }

      // Fuel type preference
      if (lowerRequirements.includes('electric') && vehicle.fuel_type === 'electric') {
        score += 1;
        reasoning += 'Electric vehicle preferred. ';
      } else if (lowerRequirements.includes('diesel') && vehicle.fuel_type === 'diesel') {
        score += 1;
        reasoning += 'Diesel vehicle preferred. ';
      }

      // General construction terms
      if (lowerRequirements.includes('construction') || lowerRequirements.includes('building')) {
        if (['excavator', 'bulldozer', 'crane'].includes(vehicle.type)) {
          score += 1;
          reasoning += 'Suitable for construction work. ';
        }
      }

      if (lowerRequirements.includes('warehouse') || lowerRequirements.includes('storage')) {
        if (vehicle.type === 'forklift') {
          score += 2;
          reasoning += 'Perfect for warehouse operations. ';
        }
      }

      if (lowerRequirements.includes('transport') || lowerRequirements.includes('hauling')) {
        if (vehicle.type === 'truck') {
          score += 2;
          reasoning += 'Ideal for transport and hauling. ';
        }
      }

      // Ensure score is within 1-10 range
      score = Math.max(1, Math.min(10, score));

      if (reasoning === '') {
        reasoning = 'General purpose equipment suitable for various tasks.';
      }

      recommendations.push({
        vehicle,
        reasoning,
        matchScore: score
      });
    });

    // Sort by score and return top 3
    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  };

  return (
    <Card id="ai-recommendation" className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>AI Vehicle Recommendation</span>
        </CardTitle>
        <CardDescription>
          Describe your project requirements and get AI-powered vehicle recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="requirements" className="text-sm font-medium">
            Describe your project requirements
          </label>
          <Textarea
            id="requirements"
            placeholder="e.g., I need heavy equipment for construction site excavation, preferably at Site A. Looking for something with high capacity for digging and moving large amounts of soil..."
            value={userRequirements}
            onChange={(e) => setUserRequirements(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button 
          onClick={analyzeRequirements} 
          disabled={isLoading || !userRequirements.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Requirements...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Get AI Recommendations
            </>
          )}
        </Button>

        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recommended Vehicles</h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={rec.vehicle.id} className="p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Score: {rec.matchScore}/10
                      </Badge>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {rec.vehicle.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{rec.vehicle.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{rec.vehicle.location}</span>
                      <span>•</span>
                      <span>{rec.vehicle.capacity}</span>
                      <span>•</span>
                      <span className="capitalize">{rec.vehicle.fuel_type}</span>
                    </div>
                    
                    <div className="text-sm bg-background p-3 rounded border">
                      <span className="font-medium">Why this vehicle:</span> {rec.reasoning}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!HUGGING_FACE_API_KEY && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Setup Required:</strong> To use AI recommendations, get a free API key from{' '}
              <a 
                href="https://huggingface.co/settings/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-yellow-600"
              >
                Hugging Face
              </a>{' '}
              and set it as VITE_HUGGING_FACE_API_KEY in your environment variables.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleRecommendation;
