import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  type: string;
  name: string;
  capacity: string;
  is_rented: boolean;
  location: string;
}

interface Rental {
  id: string;
  vehicle_id: string;
  check_out_date: string;
  expected_return_date: string;
  check_in_date: string | null;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
  vehicles: Vehicle;
}

interface Profile {
  role: string;
  name: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('user_id', user?.id)
        .single();

      setProfile(profileData);

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('name');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData);

      // Fetch rentals based on role
      if (profileData?.role === 'dealer') {
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select(`
            *,
            vehicles (*)
          `)
          .is('check_in_date', null)
          .order('expected_return_date');

        if (rentalsError) throw rentalsError;
        setRentals(rentalsData);
      } else {
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select(`
            *,
            vehicles (*)
          `)
          .eq('user_id', user?.id)
          .is('check_in_date', null)
          .order('expected_return_date');

        if (rentalsError) throw rentalsError;
        setRentals(rentalsData);
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

  const availableVehicles = vehicles.filter(v => !v.is_rented);
  const rentedVehicles = vehicles.filter(v => v.is_rented);
  const overdueRentals = rentals.filter(r => isOverdue(r.expected_return_date));
  const dueSoonRentals = rentals.filter(r => isDueSoon(r.expected_return_date));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.name || user?.email}
            {profile?.role && (
              <Badge variant="secondary" className="ml-2 capitalize">
                {profile.role}
              </Badge>
            )}
          </p>
        </div>
        <Link to="/vehicles">
          <Button>
            <Truck className="h-4 w-4 mr-2" />
            View All Vehicles
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableVehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rented</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{rentedVehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueRentals.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overdueRentals.length > 0 || dueSoonRentals.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-red-800">{rental.vehicles.name} - OVERDUE</p>
                  <p className="text-sm text-red-600">
                    Expected return: {new Date(rental.expected_return_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="destructive">Overdue</Badge>
              </div>
            ))}
            
            {dueSoonRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="font-medium text-orange-800">{rental.vehicles.name} - Due Soon</p>
                  <p className="text-sm text-orange-600">
                    Expected return: {new Date(rental.expected_return_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">Due Soon</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Rentals */}
      {rentals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Rentals</CardTitle>
            <CardDescription>
              {profile?.role === 'dealer' ? 'All active rentals' : 'Your current rentals'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rentals.slice(0, 5).map((rental) => (
                <div key={rental.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{rental.vehicles.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {rental.vehicles.type} • {rental.vehicles.capacity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Return by: {new Date(rental.expected_return_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm space-y-1">
                      <p>Working: {rental.working_time}h</p>
                      <p>Fuel: {rental.fuel_usage}L</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {rentals.length > 5 && (
              <div className="mt-4 text-center">
                <Link to="/vehicles">
                  <Button variant="outline">View All Rentals</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;