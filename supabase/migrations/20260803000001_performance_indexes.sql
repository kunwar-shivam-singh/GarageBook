-- GarageBook Version 1.1.2 Database Performance Indexes

CREATE INDEX IF NOT EXISTS idx_customers_garage_id ON customers(garage_id);
CREATE INDEX IF NOT EXISTS idx_customers_name_phone ON customers(garage_id, name, phone);

CREATE INDEX IF NOT EXISTS idx_vehicles_garage_id ON vehicles(garage_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_number_brand_model ON vehicles(garage_id, vehicle_number, brand, model);

CREATE INDEX IF NOT EXISTS idx_bills_garage_id ON bills(garage_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_vehicle_id ON bills(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bills_mechanic_id ON bills(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_bills_job_status ON bills(garage_id, job_status);

CREATE INDEX IF NOT EXISTS idx_service_jobs_garage_id ON service_jobs(garage_id);
CREATE INDEX IF NOT EXISTS idx_service_jobs_customer_id ON service_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_jobs_job_status ON service_jobs(garage_id, job_status);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_advances_bill_id ON advances(bill_id);
