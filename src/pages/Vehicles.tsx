import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck, Search, MapPin, Fuel, Clock, Activity, Zap, Calendar, User, BarChart3 } from 'lucide-react';
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
  vehicle_id: string;
  check_out_date: string;
  expected_return_date: string;
  check_in_date: string | null;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
}

interface UserProfile {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Vehicles = () => {
  const { user, profile } = useAuth();
  const role = profile?.role || 'user';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Record<string, Rental>>({});
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);


  const isVehicleRented = useMemo(() => (vehicleId: string) => !!rentals[vehicleId], [rentals]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, rentals, searchTerm, statusFilter, typeFilter]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('name');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData);

      // Fetch active rentals
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select('*')
        .is('check_in_date', null);

      if (rentalsError) throw rentalsError;

      const rentalsMap: Record<string, Rental> = {};
      (rentalsData || []).forEach((rental: any) => {
        rentalsMap[rental.vehicle_id] = rental as Rental;
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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const handleVehicleCardClick = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    const rental = rentals[vehicle.id];
    setSelectedRental(rental || null);
    
    if (rental) {
      const userProfile = await fetchUserProfile(rental.user_id);
      setSelectedUser(userProfile);
    }
    
    setIsDetailModalOpen(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatFuelUsage = (usage: number) => {
    return `${usage.toFixed(2)} L`;
  };

  const calculateRentalDuration = (checkOutDate: string, expectedReturnDate: string) => {
    const checkOut = new Date(checkOutDate);
    const expectedReturn = new Date(expectedReturnDate);
    const now = new Date();
    
    const totalDuration = expectedReturn.getTime() - checkOut.getTime();
    const elapsedDuration = now.getTime() - checkOut.getTime();
    
    const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil(elapsedDuration / (1000 * 60 * 60 * 24));
    
    return { totalDays, elapsedDays };
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
        statusFilter === 'available' ? !isVehicleRented(vehicle.id) : isVehicleRented(vehicle.id)
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
    const rental = rentals[vehicle.id];
    if (!rental) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>;
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
      // Prevent double rent by checking active rental
      const { data: existing, error: existErr } = await supabase
        .from('rentals')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .is('check_in_date', null)
        .maybeSingle();
      if (existErr) throw existErr;
      if (existing) {
        toast({ title: 'Already rented', description: 'This vehicle is currently rented.', variant: 'destructive' });
        await fetchVehicles();
        return;
      }

      const expectedReturn = new Date();
      expectedReturn.setDate(expectedReturn.getDate() + 7);

      const { error } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          expected_return_date: expectedReturn.toISOString(),
        });

      if (error) throw error;

      await fetchVehicles();

      toast({
        title: "Success",
        description: "Vehicle rented successfully!",
      });
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
  const availableVehicles = filteredVehicles.filter(v => !isVehicleRented(v.id));
  const myRentedVehicles = filteredVehicles.filter(v => rentals[v.id]?.user_id === user?.id);
  const rentedVehiclesForDealer = filteredVehicles.filter(v => isVehicleRented(v.id));

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

      {/* Role-based sections */}
      {role !== 'dealer' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Available Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableVehicles.map((vehicle) => (
                  <Card 
                    key={vehicle.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVehicleCardClick(vehicle)}
                  >
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
                      <Button 
                        className="w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRentVehicle(vehicle.id);
                        }}
                      >
                        Rent Vehicle
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {availableVehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">No available vehicles at the moment.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Current Rentals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.filter(v => rentals[v.id]?.user_id === user?.id).map((vehicle) => {
                  const rental = rentals[vehicle.id]!;
                  return (
                    <Card 
                      key={vehicle.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleVehicleCardClick(vehicle)}
                    >
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
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div>Location: {vehicle.location}</div>
                        <div>Fuel: <span className="capitalize">{vehicle.fuel_type}</span></div>
                        <div>Return by: {new Date(rental.expected_return_date).toLocaleDateString()}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {filteredVehicles.filter(v => rentals[v.id]?.user_id === user?.id).length === 0 && (
                <p className="text-sm text-muted-foreground">You have no active rentals.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Fleet (All Vehicles)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <Card 
                    key={vehicle.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVehicleCardClick(vehicle)}
                  >
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
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{vehicle.location}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Fuel className="h-4 w-4" />
                        <span className="capitalize">{vehicle.fuel_type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
                        QR: {vehicle.id}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {filteredVehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">No vehicles found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Rentals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.filter(v => isVehicleRented(v.id)).map((vehicle) => {
                  const rental = rentals[vehicle.id]!;
                  return (
                    <Card 
                      key={vehicle.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleVehicleCardClick(vehicle)}
                    >
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
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div>Location: {vehicle.location}</div>
                        <div>Fuel: <span className="capitalize">{vehicle.fuel_type}</span></div>
                        <div>Return by: {new Date(rental.expected_return_date).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">QR: {vehicle.id}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {filteredVehicles.filter(v => isVehicleRented(v.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">No active rentals.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Vehicle Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{selectedVehicle?.name}</div>
                <div className="text-lg text-muted-foreground capitalize">
                  {selectedVehicle?.type} • {selectedVehicle?.capacity}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detailed information about this vehicle and its current status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Vehicle Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium capitalize">{selectedVehicle?.type}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Capacity</div>
                  <div className="font-medium">{selectedVehicle?.capacity}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Location</div>
                  <div className="font-medium">{selectedVehicle?.location}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Fuel Type</div>
                  <div className="font-medium capitalize">{selectedVehicle?.fuel_type}</div>
                </div>
                <div className="space-y-2 col-span-2">
                  <div className="text-sm text-muted-foreground">QR Code</div>
                  <div className="font-mono text-sm bg-muted p-2 rounded">{selectedVehicle?.qr_code}</div>
                </div>
              </CardContent>
            </Card>

            {/* Rental Status */}
            {selectedRental ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Rental Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Check Out Date</div>
                        <div className="font-medium">
                          {new Date(selectedRental.check_out_date).toLocaleDateString()} at{' '}
                          {new Date(selectedRental.check_out_date).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Expected Return</div>
                        <div className="font-medium">
                          {new Date(selectedRental.expected_return_date).toLocaleDateString()} at{' '}
                          {new Date(selectedRental.expected_return_date).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    {selectedUser && (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Rented By</div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{selectedUser.name}</span>
                          <Badge variant="outline">{selectedUser.role}</Badge>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const { totalDays, elapsedDays } = calculateRentalDuration(
                        selectedRental.check_out_date,
                        selectedRental.expected_return_date
                      );
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Total Rental Duration</div>
                            <div className="font-medium">{totalDays} days</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Days Elapsed</div>
                            <div className="font-medium">{elapsedDays} days</div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Performance Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-6">
                    <div className="text-center space-y-2">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-600">
                          {formatDuration(selectedRental.idle_time)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">Idle Time</div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-600">
                          {formatDuration(selectedRental.working_time)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">Working Time</div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <Fuel className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-600">
                          {formatFuelUsage(selectedRental.fuel_usage)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">Fuel Usage</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Efficiency Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Efficiency Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Utilization Rate</div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedRental.working_time > 0 
                            ? Math.round((selectedRental.working_time / (selectedRental.working_time + selectedRental.idle_time)) * 100)
                            : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Working time vs total time
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Fuel Efficiency</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedRental.working_time > 0 
                            ? (selectedRental.fuel_usage / (selectedRental.working_time / 60)).toFixed(2)
                            : 0} L/hour
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Fuel consumption per working hour
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Availability Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Truck className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="text-lg font-medium text-green-600">Vehicle Available</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      This vehicle is currently available for rental
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vehicles;