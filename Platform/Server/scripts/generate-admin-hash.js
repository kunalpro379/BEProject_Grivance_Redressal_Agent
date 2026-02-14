import bcrypt from 'bcrypt';

const password = process.argv[2] || 'Admin@123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('\n=================================');
  console.log('Admin Password Hash Generated');
  console.log('=================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nUpdate DB.sql with this hash in the INSERT statement for admin user');
  console.log('=================================\n');
});
