import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbgnwoumcurxbeiesgql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ253b3VtY3VyeGJlaWVzZ3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2OTM1MjEsImV4cCI6MjA1NzI2OTUyMX0.mrWjG9DAS8wxrxArpg1_nHBFkRsbl80QPojxFyKbN20';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side operations only (keep this secure and never expose to the client)
export const supabaseAdmin = createClient(
  supabaseUrl,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ253b3VtY3VyeGJlaWVzZ3FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTY5MzUyMSwiZXhwIjoyMDU3MjY5NTIxfQ.oV1LiUmrFgXuxKBKwRmySa4At1Okz6_Hxk8U0XYQU5M'
); 