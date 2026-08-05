const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing delivery...');
  
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@garage.com',
    password: 'password'
  });
  if(authErr) { console.error('Login failed', authErr); return; }
  
  const garageId = auth.user.user_metadata.garage_id;
  
  const { data: jobs, error: err1 } = await supabase.from('service_jobs').select('*').eq('garage_id', garageId).not('job_status', 'eq', 'Delivered').limit(1);
  if(err1 || !jobs.length) { console.log('No active jobs found'); return; }
  const job = jobs[0];
  console.log('Found job:', job.id);

  // We can't import Next.js server actions easily in a node script.
  // I will just execute a POST request if I expose a route, but wait, I can just use Playwright locally and write a simpler script.
}
run();
