import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  type: string;
  name: string;
  capacity: string;
  is_rented: boolean;
  location: string;
  fuel_type: string;
  qr_code: string;
}

const VehicleList = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = (vehicleId: string) => {
    // For demo purposes, show QR code as text
    const qrData = `vehicle:${vehicleId}`;
    navigator.clipboard.writeText(qrData);
    toast({
      title: "QR Code Copied",
      description: "Vehicle QR code copied to clipboard",
    });
  };

  if (loading) {
    return <div className="text-center">Loading vehicles...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{vehicle.name}</span>
              <Badge variant={vehicle.is_rented ? "destructive" : "default"}>
                {vehicle.is_rented ? "Rented" : "Available"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Type:</strong> {vehicle.type}</p>
            <p><strong>Capacity:</strong> {vehicle.capacity}</p>
            <p><strong>Location:</strong> {vehicle.location}</p>
            <p><strong>Fuel:</strong> {vehicle.fuel_type}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generateQRCode(vehicle.id)}
              className="w-full"
            >
              Copy QR Code
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VehicleList;