import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupSupabase() {
  console.log('🚀 Supabase Configuration Setup\n');
  console.log('Please provide your Supabase connection details:');
  console.log('(You can find these in Supabase Dashboard → Settings → Database)\n');

  // Get Supabase details
  const projectRef = await question('Project Reference ID (e.g., abcdefghijklmnop): ');
  const password = await question('Database Password (default: kunalpro379): ') || 'kunalpro379';
  const region = await question('Region (e.g., ap-south-1, us-east-1): ') || 'ap-south-1';
  const host = await question(`Host (default: aws-0-${region}.pooler.supabase.com): `) || `aws-0-${region}.pooler.supabase.com`;
  const port = await question('Port (default: 6543): ') || '6543';

  // Construct connection string
  const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:${port}/postgres`;

  console.log('\n📝 Generated Connection String:');
  console.log(connectionString);
  console.log('');

  const confirm = await question('Update .env file with this configuration? (yes/no): ');

  if (confirm.toLowerCase() === 'yes') {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL=${connectionString}`
      );
    } else {
      envContent = `DATABASE_URL=${connectionString}\n` + envContent;
    }

    // Add Supabase specific configs
    const supabaseConfig = `
# Supabase Configuration
SUPABASE_HOST=${host}
SUPABASE_PORT=${port}
SUPABASE_DB=postgres
SUPABASE_USER=postgres.${projectRef}
SUPABASE_PASSWORD=${password}
SUPABASE_PROJECT_REF=${projectRef}
`;

    if (!envContent.includes('SUPABASE_HOST=')) {
      envContent += supabaseConfig;
    }

    fs.writeFileSync(envPath, envContent);

    console.log('✅ .env file updated successfully!\n');
    console.log('Next steps:');
    console.log('1. Enable pgvector in Supabase:');
    console.log('   - Go to SQL Editor in Supabase Dashboard');
    console.log('   - Run: CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('');
    console.log('2. Run migrations:');
    console.log('   npm run migrate');
    console.log('');
  } else {
    console.log('❌ Configuration cancelled');
  }

  rl.close();
}

setupSupabase().catch(console.error);
