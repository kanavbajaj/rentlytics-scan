import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Search, MapPin, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface VehicleSummary {
  vehicle_id: string;
  vehicle_name: string;
  vehicle_type: string;
  location: string;
  total_anomalies: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  total_anomaly_score: number;
  avg_anomaly_score: number;
  anomaly_types: string[];
}

const VehicleSummaryTable = () => {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchVehicleSummary();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchTerm, typeFilter]);

  const fetchVehicleSummary = async () => {
    try {
      const { data, error } = await supabase.rpc('get_anomaly_summary');
      
      if (error) throw error;
      
      setVehicles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch vehicle summary: " + error.message,
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
        vehicle.vehicle_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.vehicle_type === typeFilter);
    }

    setFilteredVehicles(filtered);
  };

  const getSeverityBadge = (severity: string, count: number) => {
    if (count === 0) return null;
    
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants]} className="ml-1">
        {count}
      </Badge>
    );
  };

  const getAnomalyTypesBadges = (types: string[]) => {
    if (!types || types.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1">
        {types.slice(0, 3).map((type, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {type.replace(/_/g, ' ')}
          </Badge>
        ))}
        {types.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{types.length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Anomaly Summary</CardTitle>
          <CardDescription>Loading vehicle data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Vehicle Anomaly Summary</span>
        </CardTitle>
        <CardDescription>
          Overview of anomalies detected across your vehicle fleet
        </CardDescription>
        
        {/* Filters */}
        <div className="flex space-x-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by vehicle name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="excavator">Excavator</SelectItem>
              <SelectItem value="bulldozer">Bulldozer</SelectItem>
              <SelectItem value="crane">Crane</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="forklift">Forklift</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {vehicles.length === 0 
              ? "No rented vehicles with anomalies found"
              : "No vehicles match your search criteria"
            }
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Total Anomalies</TableHead>
                <TableHead className="text-center">Severity</TableHead>
                <TableHead className="text-center">Risk Score</TableHead>
                <TableHead>Anomaly Types</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.vehicle_id}>
                  <TableCell className="font-medium">
                    {vehicle.vehicle_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {vehicle.vehicle_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{vehicle.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={vehicle.total_anomalies > 0 ? "destructive" : "secondary"}
                      className="font-bold"
                    >
                      {vehicle.total_anomalies}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-1">
                      {getSeverityBadge('high', vehicle.high_severity_count)}
                      {getSeverityBadge('medium', vehicle.medium_severity_count)}
                      {getSeverityBadge('low', vehicle.low_severity_count)}
                      {vehicle.total_anomalies === 0 && (
                        <Badge variant="secondary">None</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-bold">
                      {Math.round(vehicle.total_anomaly_score)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {Math.round(vehicle.avg_anomaly_score)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getAnomalyTypesBadges(vehicle.anomaly_types)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link to={`/anomalies?vehicle=${vehicle.vehicle_id}`}>
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleSummaryTable;
