import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dvkvfcqxvmwcggvuzusk.supabase.co';
// Usando a chave fornecida pelo usuário
const supabaseKey = 'sb_publishable_VZ7RpJNh3LRqr3rbcrYpHA_TKTHSBba';

export const supabase = createClient(supabaseUrl, supabaseKey);