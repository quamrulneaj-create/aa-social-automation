# AdmissionArena social automation

Runs on GitHub Actions. No server needed.

- **AA content** (every 6 hours): AI writes the next 24 hours of posts (English + Bangla, Hormozi + Jobs voice, no emoji), and queues the ready-made reels from the Google Drive folder "Admission Arena Reels".
- **AA publish** (every 15 minutes): renders upcoming statics and reels, then posts what is due to Facebook, Instagram, TikTok and YouTube.

Data lives in Supabase project `kwqyqklvvfwnrtkqruex` (tables `aa_channels`, `aa_content`, `aa_posts`, view `aa_post_log`). Media files go to the public storage bucket `aa-media` and are deleted after 5 days.

## Settings

Secrets (Settings > Secrets and variables > Actions > Secrets): `SUPABASE_SERVICE_KEY`, `LLM_API_KEY` (a Gemini key, also used for the AI student photos), `GOOGLE_API_KEY`. Optional: `IMAGE_API_KEY` if photos should use a different Gemini key. `HF_API_KEY_ID` + `HF_API_KEY_SECRET` (Higgsfield) turn the photo on a few reels a day into a 5-second AI video for the hook (`HF_REELS_PER_DAY`, default 4 per language). Optional: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `YT_CLIENT_ID`, `YT_CLIENT_SECRET`.

Variables (same page, Variables tab):

- `AA_DRY_RUN` = `false` to start real posting. The default is `true`, which generates content but saves and posts nothing.
- Optional: `DRIVE_PER_DAY` (8), `AA_REEL_RATIO` (0.5), `LLM_BASE_URL` + `LLM_MODEL` (Gemini by default), `YT_PRIVACY` (private), `TIKTOK_PRIVACY` (SELF_ONLY), `DRIVE_PLATFORMS` (facebook).

Page tokens and channel on/off live in the Supabase table `aa_channels`.
