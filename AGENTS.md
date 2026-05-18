# Senlo Engineering Rules

- This project must support a real account system for long-term use; mock/local users are only for anonymous local experience.
- Do not describe `localStorage`, IndexedDB, or mock users as multi-device sync.
- All core user data must carry `userId`/`user_id` and be isolated per user.
- Cloud data must be protected by backend permissions, Tencent CloudBase security rules, or Supabase Row Level Security. Frontend filtering alone is not enough.
- Do not commit real Tencent Cloud SecretId/SecretKey, Supabase service_role keys, model API keys, audio files, transcripts, or private interview examples.
- Do not hardcode private screenshot/test data into code, README, seeds, or migrations.
- UI must not claim “已同步” unless data is actually written to the configured cloud backend.
- If cloud sync fails, preserve local data and show a recoverable error.
- API keys for LLM/ASR providers must stay device-local unless a secure backend encryption strategy exists.
- Account work must not break the core flows: interview management, AI review, history saving, and model settings.
