import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Truck, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

interface Rental {
  id: string;
  user_id: string;
  check_out_date: string;
  expected_return_date: string;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
  profiles: {
    name: string;
  };
}

const QRScanner = () => {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!qrCode.trim()) return;

    setLoading(true);
    try {
      // Find vehicle by QR code
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('qr_code', qrCode.trim())
        .single();

      if (vehicleError) {
        toast({
          title: "Vehicle not found",
          description: "No vehicle found with this QR code",
          variant: "destructive",
        });
        setVehicle(null);
        setRental(null);
        return;
      }

      setVehicle(vehicleData);

      // If vehicle is rented, get rental information
      if (vehicleData.is_rented) {
        const { data: rentalData, error: rentalError } = await supabase
          .from('rentals')
          .select(`
            *,
            profiles!inner(name)
          `)
          .eq('vehicle_id', vehicleData.id)
          .is('check_in_date', null)
          .single();

        if (rentalError) {
          console.error('Error fetching rental:', rentalError);
          setRental(null);
        } else {
          setRental(rentalData as any);
        }
      } else {
        setRental(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!vehicle || !user) return;

    try {
      const expectedReturn = new Date();
      expectedReturn.setDate(expectedReturn.getDate() + 7); // Default 7 days

      const { error: rentalError } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          vehicle_id: vehicle.id,
          expected_return_date: expectedReturn.toISOString(),
        });

      if (rentalError) throw rentalError;

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ is_rented: true })
        .eq('id', vehicle.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Vehicle checked out successfully!",
      });

      // Refresh data
      handleScan();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckIn = async () => {
    if (!vehicle || !rental) return;

    try {
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({ check_in_date: new Date().toISOString() })
        .eq('id', rental.id);

      if (rentalError) throw rentalError;

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ is_rented: false })
        .eq('id', vehicle.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Vehicle checked in successfully!",
      });

      // Refresh data
      handleScan();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isOverdue = (expectedReturnDate: string) => {
    return new Date(expectedReturnDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-muted-foreground">Scan vehicle QR codes for check-in/check-out</p>
      </div>

      {/* QR Scanner Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <span>Scan QR Code</span>
          </CardTitle>
          <CardDescription>
            Enter or scan the vehicle QR code to view details and manage rentals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-code">QR Code</Label>
            <Input
              id="qr-code"
              placeholder="Enter QR code..."
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
            />
          </div>
          <Button onClick={handleScan} disabled={loading || !qrCode.trim()}>
            {loading ? 'Scanning...' : 'Scan Vehicle'}
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      {vehicle && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{vehicle.name}</CardTitle>
                  <CardDescription className="capitalize">
                    {vehicle.type} • {vehicle.capacity} • {vehicle.location}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={vehicle.is_rented ? "destructive" : "secondary"}
                className={vehicle.is_rented ? "" : "bg-green-100 text-green-800"}
              >
                {vehicle.is_rented ? "Rented" : "Available"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fuel Type:</p>
                <p className="font-medium capitalize">{vehicle.fuel_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location:</p>
                <p className="font-medium">{vehicle.location}</p>
              </div>
            </div>

            {vehicle.is_rented && rental && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-medium">Current Rental Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rented by:</p>
                    <p className="font-medium">{rental.profiles.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Check-out date:</p>
                    <p className="font-medium">
                      {new Date(rental.check_out_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected return:</p>
                    <p className={`font-medium ${isOverdue(rental.expected_return_date) ? 'text-red-600' : ''}`}>
                      {new Date(rental.expected_return_date).toLocaleDateString()}
                      {isOverdue(rental.expected_return_date) && (
                        <Badge variant="destructive" className="ml-2">Overdue</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Days rented:</p>
                    <p className="font-medium">
                      {Math.ceil((new Date().getTime() - new Date(rental.check_out_date).getTime()) / (1000 * 60 * 60 * 24))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Working time:</p>
                    <p className="font-medium">{rental.working_time} hours</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Idle time:</p>
                    <p className="font-medium">{rental.idle_time} hours</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fuel usage:</p>
                    <p className="font-medium">{rental.fuel_usage} liters</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {vehicle.is_rented ? (
                <Button onClick={handleCheckIn} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Check In (Return)</span>
                </Button>
              ) : (
                <Button onClick={handleCheckOut} className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4" />
                  <span>Check Out (Rent)</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {qrCode && !vehicle && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No vehicle found</p>
            <p className="text-sm text-muted-foreground">Please check the QR code and try again</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QRScanner;