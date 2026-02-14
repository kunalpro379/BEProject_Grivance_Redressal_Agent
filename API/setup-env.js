const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 Database Configuration Setup\n');
console.log('Please provide your PostgreSQL credentials:\n');

const questions = [
    { key: 'DB_HOST', prompt: 'Database Host (default: localhost): ', default: 'localhost' },
    { key: 'DB_PORT', prompt: 'Database Port (default: 5432): ', default: '5432' },
    { key: 'DB_NAME', prompt: 'Database Name (default: grievance_db): ', default: 'grievance_db' },
    { key: 'DB_USER', prompt: 'Database User (default: postgres): ', default: 'postgres' },
    { key: 'DB_PASSWORD', prompt: 'Database Password: ', default: '' }
];

let answers = {};
let currentQuestion = 0;

function askQuestion() {
    if (currentQuestion >= questions.length) {
        updateEnvFile();
        return;
    }

    const q = questions[currentQuestion];
    rl.question(q.prompt, (answer) => {
        answers[q.key] = answer.trim() || q.default;
        currentQuestion++;
        askQuestion();
    });
}

function updateEnvFile() {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update each value
    Object.keys(answers).forEach(key => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${answers[key]}`);
        } else {
            envContent += `\n${key}=${answers[key]}`;
        }
    });

    // Update DATABASE_URL
    const dbUrl = `postgresql://${answers.DB_USER}:${answers.DB_PASSWORD}@${answers.DB_HOST}:${answers.DB_PORT}/${answers.DB_NAME}`;
    const dbUrlRegex = /^DATABASE_URL=.*$/m;
    if (dbUrlRegex.test(envContent)) {
        envContent = envContent.replace(dbUrlRegex, `DATABASE_URL=${dbUrl}`);
    }

    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ Configuration saved to .env file\n');
    console.log('Database Configuration:');
    console.log(`  Host: ${answers.DB_HOST}`);
    console.log(`  Port: ${answers.DB_PORT}`);
    console.log(`  Database: ${answers.DB_NAME}`);
    console.log(`  User: ${answers.DB_USER}`);
    console.log(`  Password: ${'*'.repeat(answers.DB_PASSWORD.length)}\n`);
    console.log('Next steps:');
    console.log('  1. Run: npm run migrate');
    console.log('  2. Run: npm run test:db');
    console.log('  3. Run: npm run dev\n');

    rl.close();
}

askQuestion();
