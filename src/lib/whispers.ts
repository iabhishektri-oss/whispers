import { getSupabase } from './supabase'
import { getState } from './state'
import { compressImage } from './utils'

interface SaveOptions {
  format: 'write' | 'voice' | 'photo'
  content?: string | null
  audioBlob?: Blob | null
  photoFile?: File | Blob | null
  contributorId?: string | null
  sealed?: boolean
  sealType?: string | null
  sealValue?: string | null
}

interface SaveResult {
  success: boolean
  error?: string
}

export async function saveWhisper(opts: SaveOptions): Promise<SaveResult> {
  try {
    const sb = getSupabase()
    const { childId } = getState()

    if (!childId) {
      console.error('[saveWhisper] No childId')
      return { success: false, error: 'No child selected.' }
    }

    const row: Record<string, unknown> = {
      child_id: childId,
      format: opts.format,
      content: opts.content || null,
      contributor_id: opts.contributorId || null,
      sealed: opts.sealed || false,
      seal_type: opts.sealType || null,
      seal_value: opts.sealValue || null,
    }

    // Upload audio if voice
    if (opts.format === 'voice' && opts.audioBlob) {
      const filename = `${childId}/${Date.now()}.webm`
      const { error: upErr } = await sb.storage
        .from('voice-notes')
        .upload(filename, opts.audioBlob, { contentType: opts.audioBlob.type })

      if (upErr) {
        console.error('[saveWhisper] Audio upload failed:', upErr)
        return { success: false, error: 'Could not upload voice note.' }
      }

      const { data: urlData } = sb.storage.from('voice-notes').getPublicUrl(filename)
      row.audio_url = urlData.publicUrl
    }

    // Upload photo
    if (opts.photoFile) {
      const compressed = opts.photoFile instanceof File
        ? await compressImage(opts.photoFile)
        : opts.photoFile
      const filename = `${childId}/${Date.now()}.jpg`
      const { error: upErr } = await sb.storage
        .from('photos')
        .upload(filename, compressed, { contentType: 'image/jpeg' })

      if (upErr) {
        console.error('[saveWhisper] Photo upload failed:', upErr)
        return { success: false, error: 'Could not upload photo.' }
      }

      const { data: urlData } = sb.storage.from('photos').getPublicUrl(filename)
      row.photo_url = urlData.publicUrl
    }

    const { error } = await sb.from('whispers').insert(row)
    if (error) {
      console.error('[saveWhisper] Insert failed:', error)
      return { success: false, error: 'Could not save. Check your connection and try again.' }
    }

    return { success: true }
  } catch (e) {
    console.error('[saveWhisper] Unexpected error:', e)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
