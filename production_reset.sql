-- ==============================================================================
-- GARAGEBOOK PRODUCTION DATABASE RESET & DEMO SEEDING SCRIPT
-- ==============================================================================
-- WARNING: THIS SCRIPT WILL DELETE ALL TRANSACTIONAL DATA IN THE DATABASE.
-- IT WILL RESET AUTO-INCREMENTING IDENTITIES.
-- IT WILL NOT DELETE AUTHENTICATION USERS OR GARAGE CONFIGURATIONS.
-- ==============================================================================

DO $$ 
DECLARE 
    g_id uuid; 
BEGIN 
    -- 1. TRUNCATE TRANSACTIONAL TABLES
    -- This uses CASCADE to automatically clear dependent records and RESTART IDENTITY to reset sequences.
    TRUNCATE TABLE 
        public.manual_imports,
        public.followups,
        public.advances,
        public.job_timers,
        public.payments,
        public.bill_items,
        public.service_jobs,
        public.services,
        public.bills,
        public.vehicles,
        public.customers 
    RESTART IDENTITY CASCADE;

    -- 2. SEED DEMO MASTER DATA FOR EACH EXISTING GARAGE
    -- Iterates through every garage and seeds minimal default reference data.
    FOR g_id IN SELECT id FROM public.garage LOOP

        -- Insert 4 Mechanics
        INSERT INTO public.mechanics (garage_id, name) VALUES 
            (g_id, 'Raju'),
            (g_id, 'Mukesh'),
            (g_id, 'Ali'),
            (g_id, 'Vikram')
        ON CONFLICT (garage_id, name) DO NOTHING;

        -- Insert 10 Common Services
        INSERT INTO public.service_suggestions (garage_id, name, charge) VALUES 
            (g_id, 'General Service', 500.00),
            (g_id, 'Oil Change', 150.00),
            (g_id, 'Brake Pad Replacement', 200.00),
            (g_id, 'Chain Lube & Adjustment', 100.00),
            (g_id, 'Water Wash', 150.00),
            (g_id, 'Engine Oil Top-up', 50.00),
            (g_id, 'Spark Plug Replacement', 100.00),
            (g_id, 'Air Filter Cleaning', 100.00),
            (g_id, 'Carburetor Cleaning', 300.00),
            (g_id, 'Clutch Cable Replacement', 150.00)
        ON CONFLICT (garage_id, name) DO NOTHING;

        -- Insert 50 Common Spare Parts
        INSERT INTO public.part_suggestions (garage_id, name, price) VALUES 
            (g_id, 'Motul 300V Engine Oil', 850.00),
            (g_id, 'Castrol Activ 20W40', 400.00),
            (g_id, 'Motul 7100 10W50', 900.00),
            (g_id, 'Shell Advance AX7', 450.00),
            (g_id, 'NGK Spark Plug', 120.00),
            (g_id, 'Bosch Spark Plug', 100.00),
            (g_id, 'Front Brake Pad (Disc)', 250.00),
            (g_id, 'Rear Brake Shoe', 180.00),
            (g_id, 'Clutch Plate Set', 800.00),
            (g_id, 'Air Filter (Foam)', 150.00),
            (g_id, 'Air Filter (Paper)', 250.00),
            (g_id, 'Oil Filter', 100.00),
            (g_id, 'Chain Sprocket Kit', 1200.00),
            (g_id, 'O-Ring Chain', 1500.00),
            (g_id, 'Clutch Cable', 150.00),
            (g_id, 'Accelerator Cable', 120.00),
            (g_id, 'Front Brake Cable', 130.00),
            (g_id, 'Speedometer Cable', 110.00),
            (g_id, 'Headlight Bulb (Halogen)', 150.00),
            (g_id, 'Headlight Bulb (LED)', 600.00),
            (g_id, 'Tail Light Bulb', 40.00),
            (g_id, 'Indicator Bulb', 30.00),
            (g_id, 'Indicator Assembly', 200.00),
            (g_id, 'Battery (12V 4Ah)', 1100.00),
            (g_id, 'Battery (12V 5Ah)', 1300.00),
            (g_id, 'Horn', 250.00),
            (g_id, 'Rear View Mirror (Left)', 200.00),
            (g_id, 'Rear View Mirror (Right)', 200.00),
            (g_id, 'Handlebar Grips', 150.00),
            (g_id, 'Brake/Clutch Lever', 100.00),
            (g_id, 'Fork Oil (150ml)', 90.00),
            (g_id, 'Fork Oil Seal', 120.00),
            (g_id, 'Front Tyre (2.75-18)', 1500.00),
            (g_id, 'Rear Tyre (100/90-18)', 2000.00),
            (g_id, 'Tube (18 inch)', 300.00),
            (g_id, 'Chain Lube Spray', 200.00),
            (g_id, 'Chain Cleaner Spray', 150.00),
            (g_id, 'Rust Spray (WD40)', 100.00),
            (g_id, 'Engine Flush', 250.00),
            (g_id, 'Fuel Injector Cleaner', 300.00),
            (g_id, 'Shock Absorber Bush', 50.00),
            (g_id, 'Swing Arm Bush', 150.00),
            (g_id, 'Wheel Bearing (Front)', 120.00),
            (g_id, 'Wheel Bearing (Rear)', 150.00),
            (g_id, 'Cone Set (Steering Bearing)', 450.00),
            (g_id, 'Rubber Footrest', 60.00),
            (g_id, 'Silencer Guard', 250.00),
            (g_id, 'Seat Cover', 300.00),
            (g_id, 'Tank Cover', 200.00),
            (g_id, 'Key Set (Ignition & Lock)', 800.00)
        ON CONFLICT (garage_id, name) DO NOTHING;

        -- Insert Complaint Presets
        INSERT INTO public.complaint_suggestions (garage_id, name) VALUES 
            (g_id, 'Engine making abnormal noise'),
            (g_id, 'Starting trouble in the morning'),
            (g_id, 'Brakes not applying properly'),
            (g_id, 'Mileage drop'),
            (g_id, 'Chain is loose'),
            (g_id, 'Handlebar wobbling'),
            (g_id, 'Battery draining fast'),
            (g_id, 'White smoke from exhaust'),
            (g_id, 'Gears shifting hard'),
            (g_id, 'Clutch slipping')
        ON CONFLICT (garage_id, name) DO NOTHING;

        -- Insert Vehicle Brand Suggestions
        INSERT INTO public.vehicle_suggestions (garage_id, brand, model) VALUES 
            (g_id, 'Honda', 'Activa 6G'),
            (g_id, 'Honda', 'Shine'),
            (g_id, 'Honda', 'Dio'),
            (g_id, 'TVS', 'Jupiter'),
            (g_id, 'TVS', 'Apache RTR 160'),
            (g_id, 'TVS', 'Ntorq 125'),
            (g_id, 'Bajaj', 'Pulsar 150'),
            (g_id, 'Bajaj', 'Platina'),
            (g_id, 'Yamaha', 'FZ S V3'),
            (g_id, 'Yamaha', 'R15 V4'),
            (g_id, 'Yamaha', 'RayZR'),
            (g_id, 'Royal Enfield', 'Classic 350'),
            (g_id, 'Royal Enfield', 'Bullet 350'),
            (g_id, 'Suzuki', 'Access 125'),
            (g_id, 'Suzuki', 'Burgman Street'),
            (g_id, 'KTM', 'Duke 200'),
            (g_id, 'Hero', 'Splendor Plus'),
            (g_id, 'Hero', 'HF Deluxe')
        ON CONFLICT (garage_id, brand, model) DO NOTHING;

    END LOOP;
END $$;
