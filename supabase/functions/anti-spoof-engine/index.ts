import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VPN_IP_RANGES = [
  '103.1.2.0/24', // Example VPN range
  '120.45.1.0/24'
]

serve(async (req) => {
  const { propertyId, lat, lon, accuracy, videoUrl } = await req.json()
  const ip = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip')

  // 1. Proximity Check
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: isNear } = await supabase.rpc('verify_proximity', {
    p_property_id: propertyId,
    p_user_lat: lat,
    p_user_lon: lon,
    p_radius_meters: 50
  })

  // 2. Anti-Spoofing Checks
  let isSpoofed = false
  const reasons = []

  if (!isNear) {
    isSpoofed = true
    reasons.push('out_of_range')
  }

  if (accuracy > 20) {
    isSpoofed = true // Reject if accuracy is too low (common in mock location)
    reasons.push('low_gps_accuracy')
  }

  // 3. Simple VPN check (In a real 2026 app, this would query a provider)
  // if (VPN_IP_RANGES.some(range => checkIpInRange(ip, range))) { ... }

  return new Response(
    JSON.stringify({ isSpoofed, reasons, status: isSpoofed ? 'rejected' : 'flagged_for_review' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
