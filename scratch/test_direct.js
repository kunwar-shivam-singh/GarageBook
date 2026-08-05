const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const client = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: jobs } = await client.from('service_jobs').select('*').not('job_status', 'eq', 'Delivered').limit(1);
  if(!jobs || !jobs.length) { console.log('No jobs found'); return; }
  const job = jobs[0];
  const jobId = job.id;
  const garageId = job.garage_id;
  
  console.log('Testing delivery for job:', jobId);
  
  try {
      const invoiceNumber = `GB-9999`;

      const { data: billData, error: billError } = await client
        .from('bills')
        .insert({
          garage_id: garageId,
          vehicle_id: job.vehicle_id,
          customer_id: job.customer_id,
          invoice_number: invoiceNumber,
          date: new Date().toISOString(),
          labour: Number(job.labour),
          total: Number(job.total),
          notes: job.notes,
          payment_status: job.payment_status,
          mechanic_id: job.mechanic_id,
          received_amount: Number(job.received_amount),
          remaining_amount: Number(job.remaining_amount),
          expected_payment_date: job.expected_payment_date,
          followup_reminder_date: job.followup_reminder_date,
          payment_notes: job.payment_notes,
          job_status: 'Delivered',
          work_requested: job.work_requested,
          job_start_time: job.job_start_time,
          job_end_time: job.job_end_time || new Date().toISOString(),
          total_working_time: Number(job.total_working_time),
          pause_duration: Number(job.pause_duration),
          actual_working_duration: Number(job.actual_working_duration),
          timer_state: 'COMPLETED',
          last_timer_action_at: new Date().toISOString(),
          parts_total: Number(job.parts_total),
          parts_discount: Number(job.parts_discount),
          labour_total: Number(job.labour_total),
          labour_discount: Number(job.labour_discount),
          overall_discount: Number(job.overall_discount),
          advance_received: Number(job.advance_received),
          previous_due_added: Number(job.previous_due_added),
          previous_due_bill_ids: job.previous_due_bill_ids,
          overall_discount_type: job.overall_discount_type,
          overall_discount_value: Number(job.overall_discount_value),
          service_notes: job.service_notes,
          show_service_notes: job.show_service_notes
        })
        .select()
        .single();
        
      if (billError) throw billError;
      console.log('Successfully inserted into bills:', billData.id);
      
      // I am NOT updating child tables here to test just the `bills` insert
      
      const { error: delError } = await client.from('service_jobs').delete().eq('id', jobId);
      if (delError) throw delError;
      console.log('Successfully deleted from service_jobs');

  } catch(e) {
      console.error('ERROR OCCURRED:');
      console.error(e);
  }
}
run();
