import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const sql = fs.readFileSync('/tmp/check_task_progress_clean.sql', 'utf8')

async function main() {
  // Try direct pg-meta query via REST
  const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
      'apikey': KEY
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (res.ok) {
    const data = await res.json()
    console.log('exec_sql success:', data)
    return
  }
  
  const errText = await res.text()
  console.log('exec_sql failed:', res.status, errText)
  
  // Try pg-meta direct query endpoint
  const res2 = await fetch(`${URL}/pg-meta/default/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
      'apikey': KEY
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (res2.ok) {
    const data2 = await res2.json()
    console.log('pg-meta success:', data2)
    return
  }
  
  const errText2 = await res2.text()
  console.log('pg-meta failed:', res2.status, errText2)
}

main().catch(console.error)
