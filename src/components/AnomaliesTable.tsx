import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Search, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Anomaly {
  rental_id: string;
  vehicle_id: string;
  vehicle_name: string;
  vehicle_type: string;
  anomaly: string;
  severity: string;
  score: number;
  details: string;
  detected_at: string;
}

const AnomaliesTable = () => {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get('vehicle');
  
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filteredAnomalies, setFilteredAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchAnomalies();
  }, [vehicleId]);

  useEffect(() => {
    filterAnomalies();
  }, [anomalies, searchTerm, severityFilter, typeFilter]);

  const fetchAnomalies = async () => {
    try {
      let data, error;
      
      if (vehicleId) {
        // Fetch anomalies for specific vehicle
        const result = await supabase.rpc('get_vehicle_anomalies', { 
          target_vehicle_id: vehicleId 
        });
        data = result.data;
        error = result.error;
      } else {
        // Fetch all anomalies
        const result = await supabase.rpc('get_rental_anomalies');
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      
      setAnomalies(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch anomalies: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAnomalies = () => {
    let filtered = anomalies;

    if (searchTerm) {
      filtered = filtered.filter(anomaly =>
        anomaly.vehicle_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anomaly.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anomaly.anomaly.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(anomaly => anomaly.severity === severityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(anomaly => anomaly.vehicle_type === typeFilter);
    }

    setFilteredAnomalies(filtered);
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      high: { label: 'High', className: 'bg-red-100 text-red-800 border-red-200' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      low: { label: 'Low', className: 'bg-blue-100 text-blue-800 border-blue-200' }
    };
    
    const severityConfig = config[severity as keyof typeof config] || config.medium;
    
    return (
      <Badge className={severityConfig.className}>
        {severityConfig.label}
      </Badge>
    );
  };

  const getAnomalyTypeBadge = (type: string) => {
    const typeLabels = {
      overdue: 'Overdue',
      high_idle_ratio: 'High Idle',
      no_work_while_rented: 'No Work',
      excess_fuel_per_hour: 'Excess Fuel',
      long_downtime: 'Long Downtime'
    };
    
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">
        {typeLabels[type as keyof typeof typeLabels] || type}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 50) return 'text-red-600 font-bold';
    if (score >= 25) return 'text-yellow-600 font-semibold';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anomalies</CardTitle>
          <CardDescription>Loading anomaly data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
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
          <AlertTriangle className="h-5 w-5" />
          <span>
            {vehicleId ? 'Vehicle Anomalies' : 'Fleet Anomalies'}
          </span>
        </CardTitle>
        <CardDescription>
          {vehicleId 
            ? 'Detailed anomaly analysis for the selected vehicle'
            : 'Comprehensive anomaly detection across your entire fleet'
          }
        </CardDescription>
        
        {/* Filters */}
        <div className="flex space-x-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search anomalies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {!vehicleId && (
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
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {anomalies.length === 0 
              ? "No anomalies detected"
              : "No anomalies match your search criteria"
            }
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Anomaly</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnomalies.map((anomaly, index) => (
                <TableRow key={`${anomaly.rental_id}-${anomaly.anomaly}-${index}`}>
                  <TableCell className="font-medium">
                    {anomaly.vehicle_name}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200 capitalize">
                      {anomaly.vehicle_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getAnomalyTypeBadge(anomaly.anomaly)}
                  </TableCell>
                  <TableCell>
                    {getSeverityBadge(anomaly.severity)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getScoreColor(anomaly.score)}>
                      {Math.round(anomaly.score)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm text-muted-foreground truncate">
                      {anomaly.details}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateTime(anomaly.detected_at)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {/* Summary */}
        {filteredAnomalies.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Summary</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Anomalies</div>
                <div className="font-bold">{filteredAnomalies.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground">High Severity</div>
                <div className="font-bold text-red-600">
                  {filteredAnomalies.filter(a => a.severity === 'high').length}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Score</div>
                <div className="font-bold">
                  {Math.round(filteredAnomalies.reduce((sum, a) => sum + a.score, 0) / filteredAnomalies.length)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Max Score</div>
                <div className="font-bold">
                  {Math.round(Math.max(...filteredAnomalies.map(a => a.score)))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnomaliesTable;
