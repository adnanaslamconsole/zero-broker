require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testServiceRole() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Testing with URL:', process.env.SUPABASE_URL);
  console.log('Service Role Key starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10));

  // Try to toggle a user's block status
  // Replace with a real user ID from your DB
  const userId = '40387a15-08a0-4903-9633-d09f56bb5f0e'; 

  console.log(`Attempting to toggle block for user: ${userId}`);

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_blocked: true })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Update failed!', error);
  } else {
    console.log('Update success!', data);
    
    // Cleanup: set it back to false
    await supabase.from('profiles').update({ is_blocked: false }).eq('id', userId);
    console.log('Cleanup successful.');
  }
}

testServiceRole();
