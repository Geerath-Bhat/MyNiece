import { api } from './client'

export interface VoiceResult {
  intent: string; entities: Record<string, unknown>; action_taken: string
  response_message: string; log_id?: string; reminder_id?: string; success: boolean
}

export const voiceApi = {
  interpret: (transcript: string, baby_id: string) =>
    api.post<VoiceResult>('/voice/interpret', { transcript, baby_id }).then(r => r.data),
}
