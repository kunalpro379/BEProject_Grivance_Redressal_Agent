import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Realistic comment templates for different grievance categories
const commentTemplates = {
  'Roads': [
    "This pothole has been here for months now. Please fix it urgently!",
    "The road condition is getting worse day by day. When will repairs start?",
    "Thank you for looking into this. Hope it gets resolved soon.",
    "My vehicle got damaged because of this bad road. Please take action.",
    "The entire street needs resurfacing, not just patch work.",
    "Rainy season is coming, this will become worse. Please prioritize.",
    "I've reported this multiple times. Still waiting for action.",
    "Other nearby roads have been fixed. Why is ours being ignored?",
    "The road is dangerous at night. Street lights are also not working.",
    "Appreciate the quick response from the department.",
    "Can we get an update on when the work will begin?",
    "This is affecting daily commute for hundreds of residents.",
    "Please use good quality materials this time for lasting repair.",
    "The contractor did poor work last time. Please supervise properly.",
    "Thank you for the update. Looking forward to the resolution."
  ],
  'Water Supply': [
    "No water supply for 3 days now. This is unacceptable!",
    "Water pressure is very low. Can't even fill one bucket properly.",
    "When will the pipeline repair work be completed?",
    "We are getting dirty water. Please check the source.",
    "Thank you for restoring the supply. Much appreciated!",
    "The tanker service is not sufficient for the entire area.",
    "Please provide alternate water supply during repair work.",
    "Water comes only for 2 hours daily. We need better supply.",
    "The new connection is still pending after 2 months.",
    "Appreciate the prompt action by the water department.",
    "Can we get a schedule for water supply timings?",
    "The water meter is not working. Please send someone to check.",
    "Quality of water has improved. Thank you for the efforts.",
    "We need a permanent solution, not temporary fixes.",
    "Please update us on the progress of pipeline laying work."
  ],
  'Sanitation': [
    "Garbage has not been collected for a week. Very unhygienic!",
    "The dustbin is overflowing. Please empty it regularly.",
    "Stray dogs are spreading garbage everywhere.",
    "Thank you for the regular collection. Keep it up!",
    "We need more dustbins in this area.",
    "The garbage truck doesn't come on time. Please fix the schedule.",
    "Appreciate the cleanliness drive conducted last week.",
    "Plastic waste is not being segregated properly.",
    "Can we have separate bins for wet and dry waste?",
    "The sanitation workers are doing a great job. Thank you!",
    "Please provide door-to-door garbage collection service.",
    "The area smells bad due to accumulated garbage.",
    "We need awareness programs about waste segregation.",
    "Thank you for addressing this issue promptly.",
    "The new collection schedule is working well."
  ],
  'Street Lighting': [
    "All street lights are off for 2 weeks. Very unsafe at night!",
    "Only 2 out of 10 lights are working in our street.",
    "Thank you for fixing the lights. Much safer now.",
    "We need more street lights in this dark stretch.",
    "The lights go off every night around 10 PM. Please check.",
    "LED lights would be better and more energy efficient.",
    "Appreciate the quick repair work done yesterday.",
    "The light pole is damaged and dangerous. Please replace it.",
    "Can we have solar lights installed here?",
    "Thank you for the prompt response to our complaint.",
    "The new lights are too bright. Causing disturbance to residents.",
    "We need lights near the park area for children's safety.",
    "The timer needs adjustment. Lights come on too late.",
    "Great work by the electrical department. All lights working now!",
    "Please ensure regular maintenance of street lights."
  ],
  'Garbage': [
    "Garbage dump near our house is causing health issues.",
    "Please remove the illegal garbage dump immediately.",
    "The smell is unbearable. Please take urgent action.",
    "Thank you for cleaning up the area. Much better now!",
    "We need a proper garbage collection point in this locality.",
    "People are dumping construction waste here. Please stop this.",
    "The garbage truck doesn't reach our lane. Please extend service.",
    "Appreciate the efforts to keep our area clean.",
    "Can we have covered garbage bins to prevent smell?",
    "The situation has improved after your intervention. Thanks!",
    "Please put up signboards against illegal dumping.",
    "We need regular monitoring to prevent garbage accumulation.",
    "The cleanup drive was very effective. Please do it monthly.",
    "Thank you for taking swift action on this complaint.",
    "The area is much cleaner now. Great job by the team!"
  ],
  'Drainage': [
    "Drainage is blocked and water is overflowing on the road.",
    "The manhole is open and very dangerous. Please cover it.",
    "Sewage water is entering our homes. Urgent help needed!",
    "Thank you for clearing the blockage. Drainage working fine now.",
    "We need a proper drainage system in this new area.",
    "The drain cleaning is not done regularly. Please schedule it.",
    "Appreciate the quick response during the recent floods.",
    "Mosquitoes are breeding due to stagnant water in drains.",
    "Can we have covered drains to prevent blockages?",
    "Thank you for the excellent work done by the drainage team.",
    "The drainage system needs complete overhaul, not just repairs.",
    "Please clean the drains before monsoon season starts.",
    "The new drainage line has solved our flooding problem. Thanks!",
    "We need regular inspection of drainage system in our area.",
    "Great job! The drainage issue is completely resolved now."
  ],
  'Public Health': [
    "Mosquito menace is very high. Please conduct fogging.",
    "We need a health camp in our area for senior citizens.",
    "Thank you for the vaccination drive. Very helpful!",
    "Stray dogs are increasing. Please take action.",
    "The public toilet is in very bad condition. Please clean it.",
    "Appreciate the regular health awareness programs.",
    "We need a dispensary in this area. Nearest one is 5 km away.",
    "The fogging was very effective. Mosquitoes have reduced.",
    "Can we have a mobile health clinic visit our area?",
    "Thank you for the prompt action on the health hazard.",
    "We need clean drinking water facility in the public area.",
    "The health workers are doing excellent work. Keep it up!",
    "Please conduct regular inspections of food stalls.",
    "The cleanliness drive has improved public health. Thanks!",
    "We need more awareness about hygiene and sanitation."
  ],
  'Parks': [
    "The park is not maintained. Grass is overgrown.",
    "We need more benches and play equipment for children.",
    "Thank you for renovating the park. It looks beautiful now!",
    "The park lights are not working. Please fix them.",
    "Can we have a walking track in the park?",
    "Appreciate the regular maintenance of the park.",
    "We need a separate area for senior citizens in the park.",
    "The new swings and slides are great. Children love them!",
    "Please provide dustbins in the park to keep it clean.",
    "Thank you for the beautiful garden. Great place to relax now!",
    "The park needs a boundary wall for safety.",
    "Can we have outdoor gym equipment installed?",
    "The gardeners are doing excellent work. Park looks lovely!",
    "We need a drinking water facility in the park.",
    "Thank you for making this park a wonderful community space!"
  ]
};

// Generic comments that work for any category
const genericComments = [
  "Please look into this matter urgently.",
  "This has been pending for too long. Need immediate action.",
  "Thank you for acknowledging the complaint.",
  "When can we expect this to be resolved?",
  "This is affecting many families in our area.",
  "Appreciate your prompt response.",
  "Please provide an update on the progress.",
  "The situation is getting worse. Please help!",
  "Thank you for taking this seriously.",
  "We hope this gets resolved soon.",
  "Can someone from the department visit and inspect?",
  "This is a recurring problem. Need permanent solution.",
  "Thank you for the excellent service!",
  "Please keep us updated on the status.",
  "Great work by the department. Much appreciated!"
];

// Function to get random comments for a category
function getRandomComments(category, count = 10) {
  const categoryComments = commentTemplates[category] || genericComments;
  const allComments = [...categoryComments, ...genericComments];
  
  // Shuffle and pick unique comments
  const shuffled = allComments.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to get random date between grievance creation and now
function getRandomDate(grievanceDate) {
  const start = new Date(grievanceDate);
  const end = new Date();
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

async function populateComments() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to populate comments for all grievances...\n');

    // Get all grievances from Thane city
    const grievancesResult = await client.query(`
      SELECT g.id, g.category, g.created_at, g.citizen_id
      FROM usergrievance g
      JOIN grievance_location_mapping glm ON g.id = glm.grievance_id
      JOIN wards w ON glm.ward_id = w.id
      JOIN cities c ON w.city_id = c.id
      WHERE c.city_name = 'Thane'
      ORDER BY w.ward_number, g.created_at
    `);

    console.log(`Found ${grievancesResult.rows.length} grievances to add comments to.\n`);

    // Get all users (government officials) to use as commenters
    const usersResult = await client.query(`
      SELECT id, full_name FROM users WHERE role != 'admin'
    `);

    const allCommenters = usersResult.rows.map(u => ({ id: u.id, name: u.full_name }));

    console.log(`Using ${allCommenters.length} different commenters (government officials)\n`);

    let totalCommentsAdded = 0;
    let grievanceCount = 0;
    const batchSize = 50;
    let commentBatch = [];

    for (const grievance of grievancesResult.rows) {
      grievanceCount++;
      
      // Get 10 random comments for this grievance's category
      const comments = getRandomComments(grievance.category, 10);
      
      // Prepare comments for batch insert
      for (let i = 0; i < comments.length; i++) {
        const commenter = allCommenters[Math.floor(Math.random() * allCommenters.length)];
        const commentDate = getRandomDate(grievance.created_at);
        const isInternal = Math.random() < 0.2;
        
        commentBatch.push({
          grievance_id: grievance.id,
          user_id: commenter.id,
          comment: comments[i],
          is_internal: isInternal,
          created_at: commentDate
        });
      }

      // Insert batch when it reaches batchSize or at the end
      if (commentBatch.length >= batchSize || grievanceCount === grievancesResult.rows.length) {
        const values = commentBatch.map((c, idx) => {
          const base = idx * 5;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
        }).join(', ');
        
        const params = commentBatch.flatMap(c => [
          c.grievance_id, c.user_id, c.comment, c.is_internal, c.created_at
        ]);
        
        await client.query(`
          INSERT INTO grievancecomments (grievance_id, user_id, comment, is_internal, created_at)
          VALUES ${values}
        `, params);
        
        totalCommentsAdded += commentBatch.length;
        commentBatch = [];
      }

      // Progress update every 10 grievances
      if (grievanceCount % 10 === 0) {
        console.log(`Processed ${grievanceCount}/${grievancesResult.rows.length} grievances...`);
      }
    }

    console.log(`\n✅ Successfully added ${totalCommentsAdded} comments to ${grievanceCount} grievances!`);
    console.log(`Average: ${(totalCommentsAdded / grievanceCount).toFixed(1)} comments per grievance`);

  } catch (error) {
    console.error('Error populating comments:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
populateComments()
  .then(() => {
    console.log('\n✅ Comment population completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
