import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Rental {
  id: string;
  check_out_date: string;
  expected_return_date: string;
  check_in_date: string | null;
  idle_time: number;
  working_time: number;
  fuel_usage: number;
  no_operating_days: number;
  downtime: number;
  vehicles: {
    id: string;
    name: string;
    type: string;
    capacity: string;
  };
  profiles: {
    name: string;
    user_id: string;
  };
}

const UserRentals = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const { data, error } = await supabase
        .from("rentals")
        .select(`
          *,
          vehicles (id, name, type, capacity),
          profiles (name, user_id)
        `)
        .order("check_out_date", { ascending: false });

      if (error) throw error;
      setRentals((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch rentals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getReturnStatus = (expectedReturnDate: string, checkInDate: string | null) => {
    if (checkInDate) return "returned";
    
    const now = new Date();
    const expected = new Date(expectedReturnDate);
    const diffInDays = (expected.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diffInDays < 0) return "overdue";
    if (diffInDays <= 1) return "due-soon";
    return "active";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "returned":
        return <Badge variant="default">Returned</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "due-soon":
        return <Badge variant="secondary">Due Soon</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center">Loading rentals...</div>;
  }

  return (
    <div className="space-y-4">
      {rentals.length === 0 ? (
        <p className="text-center text-muted-foreground">No rentals found</p>
      ) : (
        rentals.map((rental) => {
          const status = getReturnStatus(rental.expected_return_date, rental.check_in_date);
          
          return (
            <Card key={rental.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{rental.vehicles.name}</span>
                  {getStatusBadge(status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Vehicle Type:</strong> {rental.vehicles.type}</p>
                    <p><strong>Capacity:</strong> {rental.vehicles.capacity}</p>
                    <p><strong>Rented by:</strong> {rental.profiles.name}</p>
                  </div>
                  <div>
                    <p><strong>Checked out:</strong> {formatDistanceToNow(new Date(rental.check_out_date))} ago</p>
                    <p><strong>Expected return:</strong> {formatDistanceToNow(new Date(rental.expected_return_date))}</p>
                    {rental.check_in_date && (
                      <p><strong>Returned:</strong> {formatDistanceToNow(new Date(rental.check_in_date))} ago</p>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Usage Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Working Time</p>
                      <p className="font-medium">{rental.working_time}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Idle Time</p>
                      <p className="font-medium">{rental.idle_time}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fuel Usage</p>
                      <p className="font-medium">{rental.fuel_usage}L</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Operating Days</p>
                      <p className="font-medium">{rental.no_operating_days}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Downtime</p>
                      <p className="font-medium">{rental.downtime}h</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default UserRentals;