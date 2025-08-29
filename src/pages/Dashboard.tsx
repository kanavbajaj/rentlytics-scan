import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Construction, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import KpiCards from '@/components/KpiCards';
import VehicleSummaryTable from '@/components/VehicleSummaryTable';


interface Vehicle {
  id: string;
  type: string;
  name: string;
  capacity: string;
  is_rented: boolean;
  location: string;
  fuel_type: string;
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

const Dashboard = () => {
  const { user, profile } = useAuth();
  const role = profile?.role || 'user';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('name');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      const rentalsQuery = supabase
        .from('rentals')
        .select('*')
        .is('check_in_date', null)
        .order('expected_return_date');

      const { data: rentalsData, error: rentalsError } = role === 'dealer'
        ? await rentalsQuery
        : await rentalsQuery.eq('user_id', user?.id || '');

      if (rentalsError) throw rentalsError;
      setRentals(rentalsData || []);
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

  const isOverdue = (expectedReturnDate: string) => {
    return new Date(expectedReturnDate) < new Date();
  };

  const isDueSoon = (expectedReturnDate: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(expectedReturnDate) <= tomorrow && !isOverdue(expectedReturnDate);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const rentalByVehicleId: Record<string, Rental> = Object.fromEntries(
    rentals.map(r => [r.vehicle_id, r])
  );

  const availableVehicles = vehicles.filter(v => !rentalByVehicleId[v.id]);
  const rentedVehicles = vehicles.filter(v => !!rentalByVehicleId[v.id]);
  const myRentedVehicles = vehicles.filter(v => rentalByVehicleId[v.id]?.user_id === user?.id);
  const rentedVehiclesForDealer = vehicles.filter(v => !!rentalByVehicleId[v.id]);
  const overdueRentals = rentals.filter(r => isOverdue(r.expected_return_date));
  const dueSoonRentals = rentals.filter(r => isDueSoon(r.expected_return_date));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CAT Equipment Hub</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.name || user?.email}
            {profile?.role && (
              <Badge className="ml-2 capitalize">
                {profile.role}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link to="/vehicles">
            <Button>
              <Construction className="h-4 w-4 mr-2" />
              View All Equipment
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced KPI Cards with Anomaly Detection */}
      <KpiCards />

      {/* Vehicle Anomaly Summary Table */}
      <VehicleSummaryTable />

      {/* Equipment Alerts */}
      {(overdueRentals.length > 0 || dueSoonRentals.length > 0) && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span>Equipment Alerts</span>
            </CardTitle>
            <CardDescription>Critical equipment rental notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <Construction className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-300">
                      Equipment ID: {rental.vehicle_id.slice(0, 8)}... - OVERDUE
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Expected return: {new Date(rental.expected_return_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="font-medium">OVERDUE</Badge>
              </div>
            ))}
            
            {dueSoonRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <Construction className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-800 dark:text-orange-300">
                      Equipment ID: {rental.vehicle_id.slice(0, 8)}... - Due Soon
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      Expected return: {new Date(rental.expected_return_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">DUE SOON</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Role-based sections */}
      {role !== 'dealer' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Available Vehicles</CardTitle>
              <CardDescription>Vehicles you can rent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{vehicle.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {vehicle.type} • {vehicle.capacity}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Current Rentals</CardTitle>
              <CardDescription>Your active rentals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rentals.filter(r => r.user_id === user?.id).slice(0, 5).map((rental) => (
                  <div key={rental.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Vehicle ID {rental.vehicle_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Return by: {new Date(rental.expected_return_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Rented</Badge>
                  </div>
                ))}
              </div>
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
                {vehicles.map((vehicle) => {
                  const rental = rentalByVehicleId[vehicle.id];
                  return (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{vehicle.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {vehicle.type} • {vehicle.capacity}
                        </p>
                      </div>
                      {rental ? (
                        <Badge variant="destructive">Rented</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Rentals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rentals.slice(0, 8).map((rental) => (
                  <div key={rental.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Vehicle ID {rental.vehicle_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Return by: {new Date(rental.expected_return_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Rented</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;