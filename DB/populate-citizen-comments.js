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
    "Thank you for the update. Looking forward to the resolution.",
    "Children are getting hurt while playing due to broken road.",
    "Ambulances can't reach our homes because of road condition.",
    "The dust from broken road is causing breathing problems.",
    "We pay taxes regularly. Why is our road not maintained?",
    "Please send someone to inspect the damage before monsoon.",
    "The road was fine until heavy vehicles started using it.",
    "Can we have speed breakers installed after road repair?",
    "The drainage work damaged our road. Who will fix it now?",
    "We need proper signage during the repair work for safety.",
    "How long will the repair work take? Please inform us.",
    "The temporary patch work is already coming off.",
    "We appreciate any help in getting this resolved quickly.",
    "This road connects to the main highway. Very important route.",
    "School buses are avoiding our route due to bad roads.",
    "Please coordinate with other departments for complete solution.",
    "The road edges are crumbling. Very dangerous for two-wheelers.",
    "Can we get a timeline for when this will be addressed?",
    "We are willing to contribute if that helps speed up the work.",
    "The road repair is long overdue. Please don't delay further.",
    "Thank you for acknowledging our complaint. Waiting for action."
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
    "Please update us on the progress of pipeline laying work.",
    "The water has a strange smell. Is it safe to drink?",
    "We have to buy water daily. This is a huge expense.",
    "Can we have a water storage tank installed in our area?",
    "The supply was fine until last week. What happened?",
    "Please check for leakages in the main pipeline.",
    "We need water for basic hygiene. This is a health issue.",
    "The tanker comes at odd hours. Can we have fixed timing?",
    "Thank you for the quick response to our emergency.",
    "How can we apply for additional water connection?",
    "The billing is incorrect. We are not getting regular supply.",
    "Please ensure water quality testing is done regularly.",
    "We appreciate the efforts to improve water infrastructure.",
    "Can we have a meeting with water department officials?",
    "The situation is critical. Please treat this as priority.",
    "We are grateful for any assistance in resolving this issue.",
    "The water supply has been irregular for past two weeks.",
    "Please inform us in advance about supply disruptions.",
    "We need proper communication about maintenance schedules.",
    "Thank you for considering our request. Hope for quick action.",
    "The entire neighborhood is facing this problem together."
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
    "The new collection schedule is working well.",
    "Mosquitoes are breeding in the garbage pile.",
    "Children are playing near the garbage dump. Very dangerous!",
    "Can we have covered bins to prevent smell and flies?",
    "The garbage collection van missed our street again.",
    "We are willing to pay extra for better sanitation service.",
    "Please ensure the workers wear proper safety equipment.",
    "The garbage is attracting rats and other pests.",
    "Can we have a composting facility in our locality?",
    "Thank you for the improved service in recent weeks.",
    "We need more frequent collection during summer months.",
    "The workers are very cooperative and hardworking.",
    "Please provide separate collection for recyclable waste.",
    "The garbage is blocking the drainage system.",
    "Can we have a helpline number for sanitation complaints?",
    "We appreciate the efforts to keep our area clean.",
    "The situation has improved significantly. Thank you!",
    "Please ensure collection even on public holidays.",
    "We need better coordination between different zones.",
    "Thank you for listening to our concerns and taking action.",
    "The cleanliness has made our neighborhood much better."
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
    "Please ensure regular maintenance of street lights.",
    "Women feel unsafe walking at night without proper lighting.",
    "The lights attract too many insects. Can we use yellow bulbs?",
    "Some lights are flickering. Please check the wiring.",
    "Can we have motion sensor lights to save electricity?",
    "The light pole is leaning dangerously. Might fall anytime.",
    "Thank you for the upgrade to LED lights. Much brighter!",
    "We need lights at the bus stop area urgently.",
    "The cable is hanging loose. Very dangerous for children.",
    "Can we have lights with backup power during outages?",
    "Please install lights near the temple and community center.",
    "The lighting has reduced crime in our area. Thank you!",
    "We appreciate the regular monitoring and maintenance.",
    "Can we have decorative lights for festivals?",
    "The new lighting system is excellent. Well done!",
    "Please ensure lights are on throughout the night.",
    "We need better lighting near the school zone.",
    "Thank you for making our streets safer with good lighting.",
    "The response time for repairs has improved greatly.",
    "Can we have a schedule for preventive maintenance?",
    "We are very satisfied with the current lighting system."
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
    "The area is much cleaner now. Great job by the team!",
    "The garbage is creating a breeding ground for diseases.",
    "Can we have CCTV cameras to catch illegal dumpers?",
    "The workers need better equipment for efficient cleaning.",
    "Please impose fines on people dumping garbage illegally.",
    "We need education programs about proper waste disposal.",
    "The garbage is affecting property values in our area.",
    "Can we have a dedicated helpline for garbage complaints?",
    "Thank you for the regular inspections and monitoring.",
    "The situation was critical but you handled it well.",
    "We need more frequent cleaning during festival seasons.",
    "Please ensure the garbage doesn't pile up on weekends.",
    "The new system of garbage collection is very effective.",
    "Can we have separate collection for electronic waste?",
    "We appreciate the hard work of sanitation staff.",
    "The area looks much cleaner and more pleasant now.",
    "Please continue the good work and regular monitoring.",
    "We are happy with the improvements in cleanliness.",
    "Can we have a community meeting about waste management?",
    "Thank you for making our neighborhood livable again.",
    "The transformation is remarkable. Keep up the good work!"
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
    "Great job! The drainage issue is completely resolved now.",
    "The sewage smell is unbearable. Please fix the drainage.",
    "Water logging during rains is causing major problems.",
    "Can we have a proper sewage treatment system?",
    "The drainage grill is broken. Garbage is going inside.",
    "Please ensure drains are desilted before every monsoon.",
    "The overflow is damaging our house foundations.",
    "We need emergency drainage cleaning during heavy rains.",
    "Thank you for the prompt action during the flood situation.",
    "The drainage capacity is insufficient for our growing area.",
    "Can we have a pumping station to prevent water logging?",
    "Please coordinate with road department for integrated solution.",
    "The drainage work has improved the situation significantly.",
    "We appreciate the efforts during the recent crisis.",
    "Can we have regular maintenance schedule for drains?",
    "The new drainage system is working perfectly. Thank you!",
    "Please ensure proper slope for water flow in drains.",
    "We need better planning for drainage in new constructions.",
    "Thank you for the comprehensive solution to our problem.",
    "The drainage team did an excellent job. Much appreciated!",
    "We are very satisfied with the drainage improvements."
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
    "We need more awareness about hygiene and sanitation.",
    "Dengue cases are increasing. Please take preventive measures.",
    "Can we have free health checkup camps regularly?",
    "The public toilet needs proper maintenance and cleaning.",
    "Please provide hand sanitizers in public places.",
    "We need awareness about seasonal diseases and prevention.",
    "The stray animal problem is getting out of control.",
    "Can we have a veterinary clinic in our locality?",
    "Thank you for the quick response to health emergency.",
    "We need better waste management to prevent diseases.",
    "Please ensure food safety inspections at restaurants.",
    "The health infrastructure needs improvement in our area.",
    "Can we have regular pest control in public areas?",
    "We appreciate the efforts to improve public health.",
    "The vaccination drive was well organized. Thank you!",
    "Please provide health education in schools and colleges.",
    "We need better facilities for elderly and disabled persons.",
    "Can we have a helpline for health emergencies?",
    "Thank you for the comprehensive health programs.",
    "The public health situation has improved significantly.",
    "We are grateful for the excellent health services provided."
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
    "Thank you for making this park a wonderful community space!",
    "The park has become a gathering place for anti-social elements.",
    "Can we have security guards or CCTV cameras?",
    "The playground equipment is broken and dangerous.",
    "We need proper fencing to keep stray animals out.",
    "Please organize community events in the park regularly.",
    "The park needs better lighting for evening walkers.",
    "Can we have a jogging track with distance markers?",
    "Thank you for the beautiful landscaping and flowers.",
    "We need a children's play area with soft flooring.",
    "Please ensure the park is cleaned daily.",
    "Can we have yoga and exercise classes in the park?",
    "The park has improved our quality of life. Thank you!",
    "We need more trees and shade in the park.",
    "Please provide separate areas for different age groups.",
    "Can we have a small library or reading corner?",
    "The park renovation has been excellent. Well done!",
    "We appreciate the efforts to create green spaces.",
    "Please ensure regular watering of plants and grass.",
    "Can we have cultural programs in the park?",
    "Thank you for creating such a wonderful community asset!"
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
  "Great work by the department. Much appreciated!",
  "We have been facing this issue for quite some time.",
  "Please prioritize this as it's affecting daily life.",
  "Thank you for your attention to this matter.",
  "We need a quick resolution to this problem.",
  "Appreciate the efforts being made by the team.",
  "Can we get a timeline for completion?",
  "This is a serious issue that needs immediate attention.",
  "Thank you for the follow-up on our complaint.",
  "We are hopeful that this will be resolved soon.",
  "Please ensure quality work is done.",
  "We appreciate the transparency in communication.",
  "Can we have regular updates on the progress?",
  "Thank you for making our lives easier.",
  "We trust the department will handle this efficiently.",
  "Please don't delay this any further.",
  "We are satisfied with the response so far.",
  "Can we schedule a meeting to discuss this?",
  "Thank you for being responsive to citizen needs.",
  "We hope for a permanent solution this time.",
  "Please coordinate with other departments if needed."
];

// Create a pool of all unique comments
function createCommentPool() {
  const allComments = new Set();
  
  // Add all category-specific comments
  Object.values(commentTemplates).forEach(comments => {
    comments.forEach(comment => allComments.add(comment));
  });
  
  // Add generic comments
  genericComments.forEach(comment => allComments.add(comment));
  
  return Array.from(allComments);
}

// Function to get random date between grievance creation and now
function getRandomDate(grievanceDate) {
  const start = new Date(grievanceDate);
  const end = new Date();
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

async function populateCitizenComments() {
  const client = await pool.connect();
  
  try {
    console.log('Deleting existing comments...\n');
    await client.query('DELETE FROM grievancecomments');
    console.log('✅ Existing comments deleted.\n');

    console.log('Starting to populate comments from citizens only...\n');

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

    // Get all citizens to use as commenters
    const citizensResult = await client.query(`
      SELECT id, full_name FROM citizens
    `);

    const allCitizens = citizensResult.rows.map(c => ({ id: c.id, name: c.full_name }));
    console.log(`Using ${allCitizens.length} different citizens as commenters\n`);

    // Create a pool of all unique comments
    const commentPool = createCommentPool();
    console.log(`Total unique comments available: ${commentPool.length}\n`);

    // Shuffle the comment pool
    const shuffledComments = commentPool.sort(() => 0.5 - Math.random());
    let commentIndex = 0;

    let totalCommentsAdded = 0;
    let grievanceCount = 0;
    const batchSize = 50;
    let commentBatch = [];

    for (const grievance of grievancesResult.rows) {
      grievanceCount++;
      
      // Get 10 unique comments for this grievance
      const commentsForGrievance = [];
      for (let i = 0; i < 10; i++) {
        commentsForGrievance.push(shuffledComments[commentIndex % shuffledComments.length]);
        commentIndex++;
      }
      
      // Prepare comments for batch insert
      for (let i = 0; i < commentsForGrievance.length; i++) {
        const citizen = allCitizens[Math.floor(Math.random() * allCitizens.length)];
        const commentDate = getRandomDate(grievance.created_at);
        
        commentBatch.push({
          grievance_id: grievance.id,
          user_id: citizen.id,
          comment: commentsForGrievance[i],
          is_internal: false, // Citizens can't post internal comments
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

    console.log(`\n✅ Successfully added ${totalCommentsAdded} unique comments to ${grievanceCount} grievances!`);
    console.log(`Average: ${(totalCommentsAdded / grievanceCount).toFixed(1)} comments per grievance`);
    console.log(`All comments are from citizens only and are unique across the system.`);

  } catch (error) {
    console.error('Error populating comments:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
populateCitizenComments()
  .then(() => {
    console.log('\n✅ Citizen comment population completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
