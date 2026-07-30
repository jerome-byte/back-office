import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://phyhtyfoduqbjngnekul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoeWh0eWZvZHVxYmpuZ25la3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODcyNDIsImV4cCI6MjEwMDc2MzI0Mn0.y_0NxnXgV0T6CKDuFeTCU4uYR9GvqV55pUE9tv4F8zc';

export const supabase = createClient(supabaseUrl, supabaseKey);