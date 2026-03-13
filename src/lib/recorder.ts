let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let recordingBlob: Blob | null = null

export function getRecordingBlob(): Blob | null {
  return recordingBlob
}

export function clearRecording(): void {
  recordingBlob = null
  chunks = []
}

function getMimeType(): string {
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

export async function startRecording(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = getMimeType()
    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    chunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      recordingBlob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      stream.getTracks().forEach(t => t.stop())
    }

    mediaRecorder.start()
    return true
  } catch (e) {
    console.error('Recording failed:', e)
    return false
  }
}

export function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording'
}
