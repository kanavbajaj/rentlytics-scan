import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Construction, Calendar, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
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
  const [userKPIs, setUserKPIs] = useState({
    myRentals: 0,
    overdueRentals: 0,
    availableVehicles: 0,
    totalRentals: 0
  });

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

      // Calculate user-specific KPIs
      if (role !== 'dealer') {
        const myRentals = rentalsData?.filter(r => r.user_id === user?.id) || [];
        const overdueRentals = myRentals.filter(r => new Date(r.expected_return_date) < new Date());
        const availableVehicles = vehiclesData?.filter(v => !rentalsData?.some(r => r.vehicle_id === v.id)) || [];
        
        // Get total rentals for this user
        const { count: totalRentals } = await supabase
          .from('rentals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id || '');

        setUserKPIs({
          myRentals: myRentals.length,
          overdueRentals: overdueRentals.length,
          availableVehicles: availableVehicles.length,
          totalRentals: totalRentals || 0
        });
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

  // User-specific KPI Cards
  const UserKpiCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Active Rentals</CardTitle>
          <Construction className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userKPIs.myRentals}</div>
          <p className="text-xs text-muted-foreground">
            Currently rented equipment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Equipment</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{userKPIs.availableVehicles}</div>
          <p className="text-xs text-muted-foreground">
            Ready to rent
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Rentals</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {userKPIs.overdueRentals}
          </div>
          <p className="text-xs text-muted-foreground">
            {userKPIs.overdueRentals > 0 ? 'Action required' : 'All on time'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rentals</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userKPIs.totalRentals}</div>
          <p className="text-xs text-muted-foreground">
            All-time rental history
          </p>
        </CardContent>
      </Card>
    </div>
  );

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

      {/* Role-specific KPI Cards */}
      {role === 'dealer' ? (
        <KpiCards />
      ) : (
        <UserKpiCards />
      )}

      {/* Vehicle Anomaly Summary - Only for dealers */}
      {role === 'dealer' && <VehicleSummaryTable />}

      {/* Equipment Alerts - Show only user's rentals for regular users */}
      {((role === 'dealer' && (overdueRentals.length > 0 || dueSoonRentals.length > 0)) ||
        (role !== 'dealer' && (overdueRentals.filter(r => r.user_id === user?.id).length > 0 || 
                              dueSoonRentals.filter(r => r.user_id === user?.id).length > 0))) && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span>{role === 'dealer' ? 'Equipment Alerts' : 'My Rental Alerts'}</span>
            </CardTitle>
            <CardDescription>
              {role === 'dealer' ? 'Critical equipment rental notifications' : 'Your rental notifications'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(role === 'dealer' ? overdueRentals : overdueRentals.filter(r => r.user_id === user?.id)).map((rental) => (
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
            
            {(role === 'dealer' ? dueSoonRentals : dueSoonRentals.filter(r => r.user_id === user?.id)).map((rental) => (
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
              <CardTitle>Available Equipment</CardTitle>
              <CardDescription>Equipment you can rent right now</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableVehicles.slice(0, 6).map((vehicle) => (
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
                {availableVehicles.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No equipment available at the moment
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Current Rentals</CardTitle>
              <CardDescription>Your active equipment rentals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rentals.filter(r => r.user_id === user?.id).map((rental) => (
                  <div key={rental.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Equipment ID {rental.vehicle_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Return by: {new Date(rental.expected_return_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Rented</Badge>
                  </div>
                ))}
                {rentals.filter(r => r.user_id === user?.id).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    You don't have any active rentals
                  </div>
                )}
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