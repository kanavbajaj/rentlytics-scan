import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Search, MapPin, Fuel } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  check_in_date: string | null;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
  profiles: {
    name: string;
  };
}

const Vehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Record<string, Rental>>({});
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  const fetchVehicles = async () => {
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('name');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData);

      // Fetch rental information for rented vehicles
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
          *,
          profiles!inner(name)
        `)
        .is('check_in_date', null);

      if (rentalsError) throw rentalsError;

      const rentalsMap: Record<string, Rental> = {};
      rentalsData.forEach(rental => {
        rentalsMap[rental.vehicle_id] = rental as any;
      });
      setRentals(rentalsMap);
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

  const filterVehicles = () => {
    let filtered = vehicles;

    if (searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle =>
        statusFilter === 'available' ? !vehicle.is_rented : vehicle.is_rented
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.type === typeFilter);
    }

    setFilteredVehicles(filtered);
  };

  const isOverdue = (expectedReturnDate: string) => {
    return new Date(expectedReturnDate) < new Date();
  };

  const isDueSoon = (expectedReturnDate: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(expectedReturnDate) <= tomorrow && !isOverdue(expectedReturnDate);
  };

  const getStatusBadge = (vehicle: Vehicle) => {
    if (!vehicle.is_rented) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>;
    }

    const rental = rentals[vehicle.id];
    if (!rental) {
      return <Badge variant="destructive">Rented</Badge>;
    }

    if (isOverdue(rental.expected_return_date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    if (isDueSoon(rental.expected_return_date)) {
      return <Badge className="bg-orange-100 text-orange-800">Due Soon</Badge>;
    }

    return <Badge variant="destructive">Rented</Badge>;
  };

  const handleRentVehicle = async (vehicleId: string) => {
    if (!user) return;

    try {
      const expectedReturn = new Date();
      expectedReturn.setDate(expectedReturn.getDate() + 7); // Default 7 days

      const { error } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          expected_return_date: expectedReturn.toISOString(),
        });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ is_rented: true })
        .eq('id', vehicleId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Vehicle rented successfully!",
      });

      fetchVehicles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const vehicleTypes = [...new Set(vehicles.map(v => v.type))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground">Manage and track all vehicles</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {vehicleTypes.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => {
          const rental = rentals[vehicle.id];
          
          return (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {vehicle.type} • {vehicle.capacity}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(vehicle)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{vehicle.location}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Fuel className="h-4 w-4" />
                  <span className="capitalize">{vehicle.fuel_type}</span>
                </div>

                {vehicle.is_rented && rental && (
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Rental Information</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Rented by:</p>
                        <p className="font-medium">{rental.profiles.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Return date:</p>
                        <p className="font-medium">
                          {new Date(rental.expected_return_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Working time:</p>
                        <p className="font-medium">{rental.working_time}h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fuel usage:</p>
                        <p className="font-medium">{rental.fuel_usage}L</p>
                      </div>
                    </div>
                  </div>
                )}

                {!vehicle.is_rented && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleRentVehicle(vehicle.id)}
                  >
                    Rent Vehicle
                  </Button>
                )}

                <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
                  QR: {vehicle.qr_code}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No vehicles found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Vehicles;