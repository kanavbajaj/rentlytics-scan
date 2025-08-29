import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Construction, LogOut, QrCode, User, Home, AlertTriangle, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ModeToggle } from '@/components/mode-toggle';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import VehicleRecommendation from '@/components/VehicleRecommendation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, profile } = useAuth();
  const role = profile?.role || 'user';
  const location = useLocation();
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      window.location.href = '/auth';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_rented', false)
        .order('name');

      if (vehiclesError) throw vehiclesError;
      setAvailableVehicles(vehiclesData || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    if (user && isDialogOpen) {
      fetchAvailableVehicles();
    }
  }, [user, isDialogOpen]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card cat-header-shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground">RentLogic</h1>
              <span className="text-xs text-muted-foreground">Heavy Equipment Management</span>
            </div>
          </div>
          
          {user && (
            <nav className="flex items-center space-x-4">
              <Link to="/">
                <Button
                  variant={location.pathname === '/' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              
              <Link to="/vehicles">
                <Button
                  variant={location.pathname === '/vehicles' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Construction className="h-4 w-4" />
                  <span>Equipment</span>
                </Button>
              </Link>

              <Link to="/anomalies">
                <Button
                  variant={location.pathname === '/anomalies' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Anomalies</span>
                </Button>
              </Link>

              {role !== 'dealer' && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200 dark:border-purple-800 hover:from-purple-500/20 hover:to-blue-500/20"
                    >
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span>AI Recommendations</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <span>AI Vehicle Recommendations</span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <VehicleRecommendation availableVehicles={availableVehicles} />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {role === 'dealer' && (
                <Link to="/scanner">
                  <Button
                    variant={location.pathname === '/scanner' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>QR Scanner</span>
                  </Button>
                </Link>
              )}
              
              <Link to="/profile">
                <Button
                  variant={location.pathname === '/profile' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Button>
              </Link>
              
              <ModeToggle />
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </nav>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;