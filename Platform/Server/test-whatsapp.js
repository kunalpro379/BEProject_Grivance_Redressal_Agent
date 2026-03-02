import dotenv from 'dotenv';
import whatsappService from './src/services/whatsapp.service.js';

dotenv.config();

async function testWhatsApp() {
  console.log('🧪 Testing WhatsApp Integration\n');

  // Check environment variables
  console.log('1. Checking configuration...');
  const config = {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? '✓ Set' : '✗ Missing',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? '✓ Set' : '✗ Missing',
  };
  console.log(config);

  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error('\n❌ Missing required environment variables!');
    console.log('Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  // Test phone number (replace with your test number)
  const testPhone = process.env.TEST_PHONE_NUMBER || '919892885090';
  
  console.log(`\n2. Sending test message to ${testPhone}...`);
  
  try {
    // Test 1: Simple text message
    await whatsappService.sendMessage(
      testPhone,
      '🎉 WhatsApp integration test successful!\n\nYour IGRS bot is ready to use.'
    );
    console.log('✅ Text message sent');

    // Test 2: Buttons
    console.log('\n3. Sending interactive buttons...');
    await whatsappService.sendButtons(
      testPhone,
      'What would you like to do?',
      ['Submit Report', 'Check Status', 'Help']
    );
    console.log('✅ Buttons sent');

    // Test 3: Daily reminder format
    console.log('\n4. Sending daily reminder...');
    await whatsappService.sendDailyReportReminder(testPhone, 'Test User');
    console.log('✅ Daily reminder sent');

    console.log('\n✅ All tests passed!');
    console.log('\nCheck your WhatsApp to see the messages.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run tests
testWhatsApp();
