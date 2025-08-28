# Rentlytics Scan

A comprehensive vehicle rental management system with QR code scanning capabilities.

## Features

### QR Code Scanning
The system now supports three different ways to scan QR codes:

1. **Manual Input**: Type or paste vehicle IDs directly
2. **Camera Scanner**: Real-time QR code scanning using your device's camera
3. **Photo Upload**: Upload photos containing QR codes for automatic scanning

### Photo Upload QR Scanning
- **Supported Formats**: JPG, PNG, GIF
- **File Size Limit**: Maximum 5MB
- **Automatic Processing**: QR codes are automatically detected and processed
- **Real-time Feedback**: Visual feedback during image processing
- **Error Handling**: Clear error messages for unsupported files or failed scans

### Vehicle Management
- Check-in and check-out vehicles
- Track rental periods and usage metrics
- Role-based access control (dealer vs. user)
- Real-time vehicle status updates

## Usage

### QR Code Photo Upload
1. Navigate to the QR Scanner page
2. Select "Upload Photo" mode
3. Click "Choose Image" to select a photo containing a QR code
4. The system will automatically process the image and detect any QR codes
5. If a QR code is found, it will be automatically scanned and the vehicle information will be displayed
6. You can then proceed with check-in/check-out operations

### Best Practices for Photo Upload
- Ensure the QR code is clearly visible in the photo
- Good lighting conditions improve scan accuracy
- Avoid blurry or low-resolution images
- Make sure the QR code takes up a reasonable portion of the image

## Technical Details

- Built with React + TypeScript
- Uses ZXing library for QR code image processing
- Supabase backend for data management
- Responsive design with Tailwind CSS
- Real-time camera scanning with HTML5 QR Scanner

## Getting Started

1. Install dependencies: `npm install`
2. Set up your Supabase configuration
3. Run the development server: `npm run dev`
4. Access the application at `http://localhost:5173`

## Dependencies

- `@zxing/library` - QR code image processing
- `html5-qrcode` - Real-time camera scanning
- `@supabase/supabase-js` - Backend services
- React ecosystem for the frontend
