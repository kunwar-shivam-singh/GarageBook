# Production Database Reset & Rollback Note

## What will be deleted (Transactional Data)
Executing the `production_reset.sql` script will PERMANENTLY and IRREVERSIBLY DELETE all data in the following tables across **all garages**:
1. `manual_imports` (Imported bills history)
2. `followups` (Scheduled reminders and tasks)
3. `advances` (Customer advance payments)
4. `job_timers` (Time tracking logs)
5. `payments` (All invoice payments)
6. `bill_items` (Parts associated with bills)
7. `service_jobs` (Any old service jobs references)
8. `services` (Labour associated with bills)
9. `bills` (All invoices, queue entries, and job cards)
10. `vehicles` (Customer vehicles)
11. `customers` (Customer profiles)

All auto-incrementing ID sequences (if applicable) for these tables will be reset to 1.

## What will be preserved (Master & Config Data)
The script intentionally **DOES NOT** delete:
- `garage` (Garage profile, settings, mechanic mode configurations)
- `auth.users` (Your login credentials and authentication data)
- `mechanics` (Your employee records)
- `part_suggestions` (Your custom spare parts inventory list)
- `service_suggestions` (Your custom labour list)
- `vehicle_suggestions` (Your saved vehicle brand/models)
- `complaint_suggestions` (Your saved complaint presets)

## What will be added (Demo Data)
After clearing the database, the script checks your existing master data. If the following demo data doesn't already exist in your garage, it will safely insert it:
- **4 Mechanics**: Raju, Mukesh, Ali, Vikram.
- **10 Core Services**: Oil Change, Water Wash, Brake Pad Replacement, etc.
- **50 Spare Parts**: Motul Engine Oil, NGK Spark Plugs, Brake Shoes, Clutch Cables, Tyres, Batteries, etc.
- **10 Complaint Presets**: "Starting trouble", "Mileage drop", "Engine noise", etc.
- **18 Vehicle Models**: Popular models from Honda, TVS, Bajaj, Yamaha, Royal Enfield, Suzuki, KTM, and Hero.

## How to Execute
1. Open the Supabase Dashboard.
2. Navigate to the **SQL Editor**.
3. Copy the contents of `production_reset.sql` and paste it into the editor.
4. Click **Run**.
5. Once complete, refresh your GarageBook app. The Dashboard, Queue, Bills, and Reports will be completely empty and ready for the first real production customer.

## Rollback Disclaimer
Because this uses `TRUNCATE CASCADE`, there is **no automatic rollback** within the app. Ensure you have taken a full logical backup of your Supabase database from the dashboard if you wish to retain any of the old test data.
