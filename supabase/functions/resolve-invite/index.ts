import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, serviceRoleKey)

    // Look up contributor by invite token
    const { data: contributor, error: contribErr } = await sb
      .from('contributors')
      .select('id, nickname, relationship, child_id')
      .eq('invite_token', token)
      .single()

    if (contribErr || !contributor) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up child
    const { data: child, error: childErr } = await sb
      .from('children')
      .select('id, name, dob, keeper_id')
      .eq('id', contributor.child_id)
      .single()

    if (childErr || !child) {
      return new Response(
        JSON.stringify({ error: 'Child record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up keeper name
    let keeperName = ''
    const { data: profile } = await sb
      .from('profiles')
      .select('name')
      .eq('id', child.keeper_id)
      .maybeSingle()

    if (profile) {
      keeperName = profile.name || ''
    }

    // Return only the data the giver needs
    return new Response(
      JSON.stringify({
        childId: child.id,
        childName: child.name,
        childDob: child.dob || null,
        keeperName,
        contributorId: contributor.id,
        contributorNickname: contributor.nickname,
        contributorRelationship: contributor.relationship || '',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('resolve-invite error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
