import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Truck, CheckCircle, XCircle, Camera, Upload, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Html5Qrcode } from 'html5-qrcode';
import { BrowserMultiFormatReader } from '@zxing/library';

interface Vehicle {
  id: string;
  type: string;
  name: string;
  capacity: string;
  is_rented: boolean;
  location: string;
  fuel_type: string;
  qr_code: string;
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
  no_operating_days: number;
  downtime: number;
}

const QRScanner = () => {
  const { user, profile } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [rentalMonths, setRentalMonths] = useState('1');
  const [users, setUsers] = useState<Array<{ user_id: string; name: string }>>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'manual' | 'camera' | 'upload'>('manual');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (scannedId?: string) => {
    const id = scannedId || qrCode;
    if (!id.trim()) return;

    setLoading(true);
    try {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id.trim())
        .maybeSingle();

      if (vehicleError || !vehicleData) {
        toast({
          title: 'Vehicle not found',
          description: 'No vehicle found with this ID',
          variant: 'destructive',
        });
        setVehicle(null);
        setRental(null);
        return;
      }

      setVehicle(vehicleData);

      const { data: rentalData } = await supabase
        .from('rentals')
        .select('*')
        .eq('vehicle_id', vehicleData.id)
        .is('check_in_date', null)
        .maybeSingle();
      setRental(rentalData || null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) return;
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        await html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            setQrCode(decodedText);
            setShowQrScanner(false);
            stopScanner();
            handleScan(decodedText);
          },
          () => {}
        );
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast({ title: "Camera error", description: String(err), variant: "destructive" });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (showQrScanner) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [showQrScanner]);

  const proceedCheckout = async (assignedUserId: string, months: number) => {
    if (!vehicle) return;

    try {
      // Guard: prevent double-rent
      const { data: existing } = await supabase
        .from('rentals')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .is('check_in_date', null)
        .maybeSingle();
      if (existing) {
        toast({ title: 'Already rented', description: 'This vehicle is currently rented.', variant: 'destructive' });
        await handleScan();
        return;
      }

      const expectedReturn = new Date();
      expectedReturn.setMonth(expectedReturn.getMonth() + months);

      const { error: rentalError } = await supabase
        .from('rentals')
        .insert({
          user_id: assignedUserId,
          vehicle_id: vehicle.id,
          check_out_date: new Date().toISOString(),
          expected_return_date: expectedReturn.toISOString(),
          idle_time: 0,
          working_time: 0,
          fuel_usage: 0,
          no_operating_days: 0,
          downtime: 0
        });

      if (rentalError) throw rentalError;

      // Update vehicle status to rented
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ is_rented: true })
        .eq('id', vehicle.id);

      if (vehicleError) {
        console.error('Failed to update vehicle status:', vehicleError);
      }

      // Update local vehicle state
      setVehicle(prev => prev ? { ...prev, is_rented: true } : null);

      // Update local rental state
      const newRental: Rental = {
        id: '', // This will be set by the database
        user_id: assignedUserId,
        vehicle_id: vehicle.id,
        check_out_date: new Date().toISOString(),
        expected_return_date: expectedReturn.toISOString(),
        check_in_date: null,
        idle_time: 0,
        working_time: 0,
        fuel_usage: 0,
        no_operating_days: 0,
        downtime: 0
      };
      setRental(newRental);

      toast({
        title: 'Success',
        description: 'Vehicle checked out successfully!',
      });

      setShowCheckoutDialog(false);
      setRentalMonths('1');
      setSelectedUser('');
      await handleScan();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCheckOut = async () => {
    if (!vehicle || !user) return;

    // Dealer must enter renter selection and months
    if (profile?.role === 'dealer') {
      try {
        // Fetch users for selection (role 'user')
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name')
          .eq('role', 'user')
          .order('name', { ascending: true });
        if (error) throw error;
        setUsers(data || []);
        setShowCheckoutDialog(true);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
      return;
    }

    // Non-dealer: default to 1 week as before
    try {
      const { data: existing } = await supabase
        .from('rentals')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .is('check_in_date', null)
        .maybeSingle();
      if (existing) {
        toast({ title: 'Already rented', description: 'This vehicle is currently rented.', variant: 'destructive' });
        await handleScan();
        return;
      }

      const expectedReturn = new Date();
      expectedReturn.setDate(expectedReturn.getDate() + 7);

      const { error: rentalError } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          vehicle_id: vehicle.id,
          check_out_date: new Date().toISOString(),
          expected_return_date: expectedReturn.toISOString(),
          idle_time: 0,
          working_time: 0,
          fuel_usage: 0,
          no_operating_days: 0,
          downtime: 0
        });

      if (rentalError) throw rentalError;

      // Update vehicle status to rented
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ is_rented: true })
        .eq('id', vehicle.id);

      if (vehicleError) {
        console.error('Failed to update vehicle status:', vehicleError);
      }

      // Update local vehicle state
      setVehicle(prev => prev ? { ...prev, is_rented: true } : null);

      // Update local rental state
      const newRental: Rental = {
        id: '', // This will be set by the database
        user_id: user.id,
        vehicle_id: vehicle.id,
        check_out_date: new Date().toISOString(),
        expected_return_date: expectedReturn.toISOString(),
        check_in_date: null,
        idle_time: 0,
        working_time: 0,
        fuel_usage: 0,
        no_operating_days: 0,
        downtime: 0
      };
      setRental(newRental);

      toast({
        title: 'Success',
        description: 'Vehicle checked out successfully!',
      });

      await handleScan();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const confirmDealerCheckout = async () => {
    if (!vehicle) return;
    const monthsNum = parseInt(rentalMonths || '0', 10);
    if (!selectedUser || !monthsNum || monthsNum < 1) {
      toast({ title: 'Missing info', description: 'Select a user and months (>=1).', variant: 'destructive' });
      return;
    }
    await proceedCheckout(selectedUser, monthsNum);
  };

  const handleCheckIn = async () => {
    if (!vehicle || !rental) return;

    try {
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({ check_in_date: new Date().toISOString() })
        .eq('id', rental.id);

      if (rentalError) throw rentalError;

      // Update vehicle status to available
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ is_rented: false })
        .eq('id', vehicle.id);

      if (vehicleError) {
        console.error('Failed to update vehicle status:', vehicleError);
      }

      // Update local states
      setVehicle(prev => prev ? { ...prev, is_rented: false } : null);
      setRental(null);

      toast({
        title: 'Success',
        description: 'Vehicle checked in successfully!',
      });

      await handleScan();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setQrCode('');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isOverdue = (expectedReturnDate: string) => {
    return new Date(expectedReturnDate) < new Date();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setProcessingImage(true);
    try {
      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        
        // Process the image to find QR code
        await processImageForQR(result);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process image: " + error.message,
        variant: "destructive",
      });
      setProcessingImage(false);
    }
  };

  const processImageForQR = async (imageDataUrl: string) => {
    try {
      // Create an image element
      const img = new Image();
      
      // Set up the image loading promise
      const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
      });
      
      // Set the image source
      img.src = imageDataUrl;
      
      // Wait for image to load
      await imageLoadPromise;
      
      // Use ZXing to decode QR code directly from the image element
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImage(img);
      
      if (result && result.getText()) {
        const qrText = result.getText();
        setQrCode(qrText);
        toast({
          title: "Success",
          description: "QR code found in image: " + qrText,
        });
        // Automatically scan the found QR code
        await handleScan(qrText);
      } else {
        toast({
          title: "No QR Code Found",
          description: "No QR code was detected in the uploaded image",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      if (error.name === 'NotFoundException') {
        toast({
          title: "No QR Code Found",
          description: "No QR code was detected in the uploaded image",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to decode QR code: " + error.message,
          variant: "destructive",
        });
      }
    } finally {
      setProcessingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-muted-foreground">Scan or enter vehicle IDs for check-in/check-out</p>
      </div>

      {/* Scan Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <span>Scan Mode</span>
          </CardTitle>
          <CardDescription>
            Choose how you want to scan the QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={scanMode === "manual" ? "default" : "outline"}
              onClick={() => setScanMode("manual")}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Manual Input
            </Button>
            <Button
              variant={scanMode === "camera" ? "default" : "outline"}
              onClick={() => setScanMode("camera")}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Camera Scanner
            </Button>
            <Button
              variant={scanMode === "upload" ? "default" : "outline"}
              onClick={() => setScanMode("upload")}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Photo
            </Button>
          </div>

          {/* Instructions for each mode */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong>
              {scanMode === "manual" && " Type or paste the vehicle ID directly (e.g., vehicle:123)"}
              {scanMode === "camera" && " Use your device's camera to scan QR codes in real-time"}
              {scanMode === "upload" && " Upload a photo containing a QR code to scan it automatically"}
            </p>
          </div>

          {/* Manual Input Mode */}
          {scanMode === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-code">Vehicle ID</Label>
                <Input
                  id="qr-code"
                  placeholder="Enter vehicle ID..."
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                />
              </div>
              <Button onClick={() => handleScan()} disabled={loading || !qrCode.trim()}>
                {loading ? 'Looking up vehicle...' : 'Lookup Vehicle'}
              </Button>
            </div>
          )}

          {/* Camera Scanner Mode */}
          {scanMode === "camera" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowQrScanner(!showQrScanner)}>
                  <Camera className="h-4 w-4 mr-2" />
                  {showQrScanner ? 'Close Scanner' : 'Scan QR'}
                </Button>
              </div>
              {showQrScanner && <div id="qr-reader" className="w-full h-64 border rounded-lg"></div>}
            </div>
          )}

          {/* Upload Photo Mode */}
          {scanMode === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {!uploadedImage ? (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">Upload a photo with a QR code</p>
                      <p className="text-sm text-muted-foreground">
                        Supported formats: JPG, PNG, GIF (max 5MB)
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingImage}
                      className="flex items-center gap-2"
                    >
                      {processingImage ? "Processing..." : "Choose Image"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={uploadedImage}
                        alt="Uploaded QR code"
                        className="max-w-full max-h-64 mx-auto rounded-lg"
                      />
                      {processingImage && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            Processing image...
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processingImage}
                        variant="outline"
                      >
                        Choose Different Image
                      </Button>
                      <Button
                        onClick={() => {
                          clearUploadedImage();
                        }}
                        disabled={processingImage}
                        variant="outline"
                      >
                        Clear Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {qrCode && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>QR Code Found:</strong> {qrCode}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      {vehicle && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{vehicle.name}</CardTitle>
                  <CardDescription className="capitalize">
                    {vehicle.type} • {vehicle.capacity} • {vehicle.location}
                  </CardDescription>
                </div>
              </div>
              {rental ? (
                <Badge variant="destructive">Rented</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fuel Type:</p>
                <p className="font-medium capitalize">{vehicle.fuel_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location:</p>
                <p className="font-medium">{vehicle.location}</p>
              </div>
            </div>

            {rental && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-medium">Current Rental Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Check-out date:</p>
                    <p className="font-medium">
                      {new Date(rental.check_out_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected return:</p>
                    <p className={`font-medium ${isOverdue(rental.expected_return_date) ? 'text-red-600' : ''}`}>
                      {new Date(rental.expected_return_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Working time:</p>
                    <p className="font-medium">{rental.working_time} hours</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fuel usage:</p>
                    <p className="font-medium">{rental.fuel_usage} liters</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {rental ? (
                <Button onClick={handleCheckIn} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Check In (Return)</span>
                </Button>
              ) : (
                <Button onClick={handleCheckOut} className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4" />
                  <span>Check Out (Rent)</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {qrCode && !vehicle && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No vehicle found</p>
            <p className="text-sm text-muted-foreground">Please check the vehicle ID and try again</p>
          </CardContent>
        </Card>
      )}

      {/* Dealer Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Rental</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rental-months">Number of Months</Label>
              <Input
                id="rental-months"
                type="number"
                min={1}
                value={rentalMonths}
                onChange={(e) => setRentalMonths(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCheckoutDialog(false)}>Cancel</Button>
              <Button onClick={confirmDealerCheckout}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRScanner;