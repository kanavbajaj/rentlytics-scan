-- Create enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM ('excavator', 'truck', 'crane', 'bulldozer', 'forklift', 'other');

-- Create vehicles table
CREATE TABLE public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type vehicle_type NOT NULL,
    name TEXT NOT NULL,
    capacity TEXT NOT NULL,
    is_rented BOOLEAN NOT NULL DEFAULT false,
    qr_code TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    location TEXT,
    fuel_type TEXT DEFAULT 'diesel',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rentals table
CREATE TABLE public.rentals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    check_out_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expected_return_date TIMESTAMP WITH TIME ZONE NOT NULL,
    check_in_date TIMESTAMP WITH TIME ZONE,
    idle_time INTEGER DEFAULT 0,
    working_time INTEGER DEFAULT 0,
    fuel_usage DECIMAL DEFAULT 0,
    no_operating_days INTEGER DEFAULT 0,
    downtime INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles (viewable by all authenticated users)
CREATE POLICY "Vehicles are viewable by authenticated users" 
ON public.vehicles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Dealers can manage vehicles" 
ON public.vehicles 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'dealer'
    )
);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rentals
CREATE POLICY "Users can view their own rentals" 
ON public.rentals 
FOR SELECT 
TO authenticated 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'dealer'
    )
);

CREATE POLICY "Dealers can manage all rentals" 
ON public.rentals 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'dealer'
    )
);

CREATE POLICY "Users can create rentals" 
ON public.rentals 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at
    BEFORE UPDATE ON public.rentals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.vehicles (type, name, capacity, location, fuel_type) VALUES
('excavator', 'CAT 320D', '20 ton', 'Warehouse A', 'diesel'),
('truck', 'Volvo FH16', '40 ton', 'Warehouse B', 'diesel'),
('crane', 'Liebherr LTM 1030', '30 ton', 'Warehouse A', 'diesel'),
('bulldozer', 'CAT D6T', '18 ton', 'Warehouse C', 'diesel'),
('forklift', 'Toyota 8FBE20', '2 ton', 'Warehouse B', 'electric');