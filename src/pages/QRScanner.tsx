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
  vehicle_id: string;
  check_out_date: string;
  expected_return_date: string;
  check_in_date: string | null;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
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
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', qrCode.trim())
        .maybeSingle();

      if (vehicleError || !vehicleData) {
        toast({
          title: 'Vehicle not found',
          description: 'No vehicle found with this ID',
          variant: 'destructive',
        });
        setVehicle(null);
        setRental(null);
        return;
      }

      setVehicle(vehicleData);

      const { data: rentalData } = await supabase
        .from('rentals')
        .select('*')
        .eq('vehicle_id', vehicleData.id)
        .is('check_in_date', null)
        .maybeSingle();
      setRental(rentalData || null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!vehicle || !user) return;

    try {
      // Guard: prevent double-rent
      const { data: existing } = await supabase
        .from('rentals')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .is('check_in_date', null)
        .maybeSingle();
      if (existing) {
        toast({ title: 'Already rented', description: 'This vehicle is currently rented.', variant: 'destructive' });
        await handleScan();
        return;
      }

      const expectedReturn = new Date();
      expectedReturn.setDate(expectedReturn.getDate() + 7);

      const { error: rentalError } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          vehicle_id: vehicle.id,
          expected_return_date: expectedReturn.toISOString(),
        });

      if (rentalError) throw rentalError;

      toast({
        title: 'Success',
        description: 'Vehicle checked out successfully!',
      });

      await handleScan();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
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

      toast({
        title: 'Success',
        description: 'Vehicle checked in successfully!',
      });

      await handleScan();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
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
        <p className="text-muted-foreground">Scan vehicle IDs for check-in/check-out</p>
      </div>

      {/* QR Scanner Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <span>Scan Vehicle ID</span>
          </CardTitle>
          <CardDescription>
            Enter or scan the vehicle ID to view details and manage rentals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-code">Vehicle ID</Label>
            <Input
              id="qr-code"
              placeholder="Enter vehicle ID..."
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
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
              {rental ? (
                <Badge variant="destructive">Rented</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
              )}
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

            {rental && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-medium">Current Rental Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Working time:</p>
                    <p className="font-medium">{rental.working_time} hours</p>
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
              {rental ? (
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
            <p className="text-sm text-muted-foreground">Please check the vehicle ID and try again</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QRScanner;