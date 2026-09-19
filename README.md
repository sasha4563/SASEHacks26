# SASEHacks26

## Supabase setup

1. Copy `.env.example` to `.env`.
2. Add the project URL and publishable key from the Supabase dashboard.
3. Import the shared client with `import { supabase } from './lib/supabase'`.

Never put a Supabase secret or service-role key in frontend environment variables. The frontend should use only the publishable key.