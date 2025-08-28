import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  address: string;
  phone: string;
  role: string;
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setName(data.name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setRole(data.role || 'user');
      } else {
        // No profile exists, use default values
        setName(user?.user_metadata?.name || '');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const profileData = {
        user_id: user?.id,
        name,
        address,
        phone,
        role,
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
          <CardDescription>
            Update your personal details and account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Dealers can manage all vehicles and rentals
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address"
              />
            </div>

            <Button type="submit" disabled={saving} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">User ID:</p>
              <p className="font-mono text-xs">{user?.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account created:</p>
              <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last sign in:</p>
              <p>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email verified:</p>
              <p>{user?.email_confirmed_at ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;