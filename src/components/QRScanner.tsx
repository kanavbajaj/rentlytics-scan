import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  capacity: string;
  is_rented: boolean;
  location: string;
}

interface Rental {
  id: string;
  check_out_date: string;
  expected_return_date: string;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
  no_operating_days: number;
  downtime: number;
  profiles: { name: string };
}

const QRScanner = () => {
  const [qrInput, setQrInput] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState<"checkout" | "checkin" | null>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const scanQR = async () => {
    if (!qrInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a QR code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Extract vehicle ID from QR code
      const vehicleId = qrInput.replace("vehicle:", "");
      
      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .single();

      if (vehicleError) throw vehicleError;
      setVehicle(vehicleData);

      if (vehicleData.is_rented) {
        // Vehicle is rented, fetch rental details for check-in
        const { data: rentalData, error: rentalError } = await supabase
          .from("rentals")
          .select(`
            *,
            profiles (name)
          `)
          .eq("vehicle_id", vehicleId)
          .is("check_in_date", null)
          .single();

        if (rentalError) throw rentalError;
        setRental(rentalData as any);
        setAction("checkin");
      } else {
        // Vehicle is available for check-out
        if (profile?.role === "dealer") {
          // Fetch users for dealer to assign rental
          const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "user");

          if (usersError) throw usersError;
          setUsers(usersData || []);
        }
        setAction("checkout");
      }
      
      setShowDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to scan QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!vehicle || !expectedReturnDate) return;

    const userId = profile?.role === "dealer" ? selectedUser : user?.id;
    if (!userId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create rental record
      const { error: rentalError } = await supabase
        .from("rentals")
        .insert({
          user_id: userId,
          vehicle_id: vehicle.id,
          expected_return_date: expectedReturnDate,
        });

      if (rentalError) throw rentalError;

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ is_rented: true })
        .eq("id", vehicle.id);

      if (vehicleError) throw vehicleError;

      toast({
        title: "Success",
        description: "Vehicle checked out successfully",
      });
      
      setShowDialog(false);
      resetForm();
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

  const handleCheckIn = async () => {
    if (!vehicle || !rental) return;

    setLoading(true);
    try {
      // Update rental with check-in date
      const { error: rentalError } = await supabase
        .from("rentals")
        .update({ check_in_date: new Date().toISOString() })
        .eq("id", rental.id);

      if (rentalError) throw rentalError;

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ is_rented: false })
        .eq("id", vehicle.id);

      if (vehicleError) throw vehicleError;

      toast({
        title: "Success",
        description: "Vehicle checked in successfully",
      });
      
      setShowDialog(false);
      resetForm();
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

  const resetForm = () => {
    setQrInput("");
    setVehicle(null);
    setRental(null);
    setAction(null);
    setExpectedReturnDate("");
    setSelectedUser("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter QR code (e.g., vehicle:123) or scan QR"
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
        />
        <Button onClick={scanQR} disabled={loading}>
          {loading ? "Scanning..." : "Scan"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        For demo purposes, copy QR codes from the vehicle list and paste them here.
        QR codes follow the format: vehicle:[vehicle-id]
      </p>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "checkout" ? "Check Out Vehicle" : "Check In Vehicle"}
            </DialogTitle>
          </DialogHeader>
          
          {vehicle && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{vehicle.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Type:</strong> {vehicle.type}</p>
                  <p><strong>Capacity:</strong> {vehicle.capacity}</p>
                  <p><strong>Location:</strong> {vehicle.location}</p>
                </CardContent>
              </Card>

              {action === "checkout" && (
                <div className="space-y-4">
                  {profile?.role === "dealer" && (
                    <div>
                      <Label htmlFor="user-select">Assign to User</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="return-date">Expected Return Date</Label>
                    <Input
                      id="return-date"
                      type="datetime-local"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCheckOut} disabled={loading} className="w-full">
                    {loading ? "Checking out..." : "Check Out"}
                  </Button>
                </div>
              )}

              {action === "checkin" && rental && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Rental Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p><strong>Rented by:</strong> {rental.profiles.name}</p>
                      <p><strong>Check-out:</strong> {new Date(rental.check_out_date).toLocaleDateString()}</p>
                      <p><strong>Expected return:</strong> {new Date(rental.expected_return_date).toLocaleDateString()}</p>
                      
                      <div className="mt-4">
                        <h4 className="font-semibold">Usage Metrics</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>Working: {rental.working_time}h</p>
                          <p>Idle: {rental.idle_time}h</p>
                          <p>Fuel: {rental.fuel_usage}L</p>
                          <p>Downtime: {rental.downtime}h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button onClick={handleCheckIn} disabled={loading} className="w-full">
                    {loading ? "Checking in..." : "Check In"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRScanner;