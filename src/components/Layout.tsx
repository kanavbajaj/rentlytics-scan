import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Truck, LogOut, QrCode, User, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">RentTrack</h1>
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
                  <Truck className="h-4 w-4" />
                  <span>Vehicles</span>
                </Button>
              </Link>
              
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