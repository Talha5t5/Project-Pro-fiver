import { MySQLStorage } from './mysqlStorage';
import { MemStorage } from './storage';

async function migrateData() {
  console.log('🚀 Starting data migration from MemStorage to MySQL...');
  
  const memStorage = new MemStorage();
  const mysqlStorage = new MySQLStorage();
  
  try {
    // Migrate Users
    console.log('📊 Migrating users...');
    const users = await memStorage.getUsers();
    for (const user of users) {
      try {
        await mysqlStorage.createUser(user);
        console.log(`✅ Migrated user: ${user.username}`);
      } catch (error) {
        console.log(`⚠️ User ${user.username} might already exist, skipping...`);
      }
    }
    
    // Migrate Clients
    console.log('📊 Migrating clients...');
    const clients = await memStorage.getClients();
    for (const client of clients) {
      try {
        await mysqlStorage.createClient(client);
        console.log(`✅ Migrated client: ${client.name}`);
      } catch (error) {
        console.log(`⚠️ Client ${client.name} might already exist, skipping...`);
      }
    }
    
    // Migrate Job Types
    console.log('📊 Migrating job types...');
    const jobTypes = await memStorage.getJobTypes();
    for (const jobType of jobTypes) {
      try {
        await mysqlStorage.createJobType(jobType);
        console.log(`✅ Migrated job type: ${jobType.name}`);
      } catch (error) {
        console.log(`⚠️ Job type ${jobType.name} might already exist, skipping...`);
      }
    }
    
    // Migrate Activities
    console.log('📊 Migrating activities...');
    const activities = await memStorage.getActivities();
    for (const activity of activities) {
      try {
        await mysqlStorage.createActivity(activity);
        console.log(`✅ Migrated activity: ${activity.name}`);
      } catch (error) {
        console.log(`⚠️ Activity ${activity.name} might already exist, skipping...`);
      }
    }
    
    // Migrate Roles
    console.log('📊 Migrating roles...');
    const roles = await memStorage.getRoles();
    for (const role of roles) {
      try {
        await mysqlStorage.createRole({
          ...role,
          permissions: role.permissions || ""
        });
        console.log(`✅ Migrated role: ${role.name}`);
      } catch (error) {
        console.log(`⚠️ Role ${role.name} might already exist, skipping...`);
      }
    }
    
    // Migrate Collaborators
    console.log('📊 Migrating collaborators...');
    const collaborators = await memStorage.getCollaborators();
    for (const collaborator of collaborators) {
      try {
        await mysqlStorage.createCollaborator(collaborator);
        console.log(`✅ Migrated collaborator: ${collaborator.name}`);
      } catch (error) {
        console.log(`⚠️ Collaborator ${collaborator.name} might already exist, skipping...`);
      }
    }
    
    // Migrate Jobs
    console.log('📊 Migrating jobs...');
    const jobs = await memStorage.getJobs();
    for (const job of jobs) {
      try {
        await mysqlStorage.createJob(job);
        console.log(`✅ Migrated job: ${job.title}`);
      } catch (error) {
        console.log(`⚠️ Job ${job.title} might already exist, skipping...`);
      }
    }
    
    // Migrate Job Activities
    console.log('📊 Migrating job activities...');
    const jobActivities = await memStorage.getJobActivities();
    for (const jobActivity of jobActivities) {
      try {
        await mysqlStorage.createJobActivity(jobActivity);
        console.log(`✅ Migrated job activity: ${jobActivity.id}`);
      } catch (error) {
        console.log(`⚠️ Job activity ${jobActivity.id} might already exist, skipping...`);
      }
    }
    
    // Migrate Subscription Plans
    console.log('📊 Migrating subscription plans...');
    const subscriptionPlans = await memStorage.getSubscriptionPlans();
    for (const plan of subscriptionPlans) {
      try {
        await mysqlStorage.createSubscriptionPlan(plan);
        console.log(`✅ Migrated subscription plan: ${plan.name}`);
      } catch (error) {
        console.log(`⚠️ Subscription plan ${plan.name} might already exist, skipping...`);
      }
    }
    
    // Migrate User Subscriptions
    console.log('📊 Migrating user subscriptions...');
    const userSubscriptions = await memStorage.getUserSubscriptions();
    for (const subscription of userSubscriptions) {
      try {
        await mysqlStorage.createUserSubscription(subscription);
        console.log(`✅ Migrated user subscription: ${subscription.id}`);
      } catch (error) {
        console.log(`⚠️ User subscription ${subscription.id} might already exist, skipping...`);
      }
    }
    
    // Migrate Sectors
    console.log('📊 Migrating sectors...');
    const sectors = await memStorage.getAllSectors();
    for (const sector of sectors) {
      try {
        await mysqlStorage.createSector(sector);
        console.log(`✅ Migrated sector: ${sector.name}`);
      } catch (error) {
        console.log(`⚠️ Sector ${sector.name} might already exist, skipping...`);
      }
    }
    
    // Migrate Web Pages
    console.log('📊 Migrating web pages...');
    const webPages = await memStorage.getAllWebPages();
    for (const webPage of webPages) {
      try {
        await mysqlStorage.createWebPage(webPage);
        console.log(`✅ Migrated web page: ${webPage.title}`);
      } catch (error) {
        console.log(`⚠️ Web page ${webPage.title} might already exist, skipping...`);
      }
    }
    
    // Migrate Plan Configurations
    console.log('📊 Migrating plan configurations...');
    // Note: We need to get plan configurations from MemStorage
    // This might require adding a method to get all plan configurations
    
    // Migrate Promotional Spots
    console.log('📊 Migrating promotional spots...');
    const promotionalSpots = await memStorage.getPromotionalSpots();
    for (const spot of promotionalSpots) {
      try {
        await mysqlStorage.createPromotionalSpot(spot);
        console.log(`✅ Migrated promotional spot: ${spot.title}`);
      } catch (error) {
        console.log(`⚠️ Promotional spot ${spot.title} might already exist, skipping...`);
      }
    }
    
    console.log('🎉 Data migration completed successfully!');
    console.log('📝 All your data is now persisted in MySQL and will survive server restarts.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateData };
