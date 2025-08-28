import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, AlertTriangle, Clock, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface KPIData {
  totalVehicles: number;
  rentedVehicles: number;
  activeAnomalies: number;
  overdueRentals: number;
}

const KpiCards = () => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalVehicles: 0,
    rentedVehicles: 0,
    activeAnomalies: 0,
    overdueRentals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      // Get total vehicles count
      const { count: totalVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      if (vehiclesError) throw vehiclesError;

      // Get rented vehicles count
      const { count: rentedVehicles, error: rentedError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('is_rented', true);

      if (rentedError) throw rentedError;

      // Get active anomalies count using RPC
      const { data: anomaliesData, error: anomaliesError } = await supabase
        .rpc('get_rental_anomalies');

      if (anomaliesError) throw anomaliesError;

      const activeAnomalies = anomaliesData?.length || 0;

      // Get overdue rentals count
      const { count: overdueRentals, error: overdueError } = await supabase
        .from('rentals')
        .select('*', { count: 'exact', head: true })
        .is('check_in_date', null)
        .lt('expected_return_date', new Date().toISOString());

      if (overdueError) throw overdueError;

      setKpiData({
        totalVehicles: totalVehicles || 0,
        rentedVehicles: rentedVehicles || 0,
        activeAnomalies,
        overdueRentals: overdueRentals || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch KPI data: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.totalVehicles}</div>
          <p className="text-xs text-muted-foreground">
            Fleet inventory
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Currently Rented</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.rentedVehicles}</div>
          <p className="text-xs text-muted-foreground">
            {kpiData.totalVehicles > 0 
              ? `${Math.round((kpiData.rentedVehicles / kpiData.totalVehicles) * 100)}% utilization`
              : 'No vehicles'
            }
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {kpiData.activeAnomalies}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpiData.activeAnomalies > 0 ? 'Requires attention' : 'All normal'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Rentals</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {kpiData.overdueRentals}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpiData.overdueRentals > 0 ? 'Immediate action needed' : 'All on time'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiCards;
