const { db, Team, Player } = require('./setup');
const bcrypt = require('bcryptjs');
// Sample team data

// Sample users (for when User model is added in step 5)
const sampleUsers = [
  {
    name: "John Doe",
    email: "john@example.com", 
    password: "password123"
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "password123"
  }
];

const sampleteams = [
    {
        name: "Dragons",
        record: "[10 wins, 2 losses]",
        manager: "Steve Smith",
        nextGame: new Date('2024-12-31'),
        teamId: 1
    },
    {
        name: "Knights", 
        record: "[5 wins, 1 loss]",
        manager: "Cameron Johnson",
        nextGame: new Date('2024-11-15'),
        teamId: 2
    }
];

// Sample player data
const sampleplayers = [
    {
        name: "Duncan McGehee",
        currentTeam: "Dragons",
        record: ["10 wins, 2 losses"],
        goals: 8,
        saves: 2,
        assists: 0,
        teamId: 1
    },
    {
        name: "Carson Pearce",
        currentTeam: "Knights",
        record: ["5 wins, 1 loss"],
        goals: 5,
        saves: 4,
        assists: 2,
        teamId: 2
    },
    {
        name: "Aidan Acton",
        currentTeam: "Dragons",
        record: ["3 wins, 2 losses"],
        goals: 3,
        saves: 0,
        assists: 1,
        teamId: 1
    },
    {
        name: "Logan Eziekiel",
        currentTeam: "Knights",
        record: ["0 wins, 0 losses"],
        goals: 2,
        saves: 6,
        assists: 4,
        teamId: 2
    },
    {
        name: "Peter Stewart",
        currentTeam: "Dragons",
        record: ["5 wins, 1 loss"],
        goals: 8,
        saves: 1,
        assists: 2,
        teamId: 1
    },
    {
        name: "Teron Neiville",
        currentTeam: "Knights",
        record: ["0 wins, 0 losses"],
        goals: 0,
        saves: 5,
        assists: 3,
        teamId: 2
    }
];

// Seed database with sample data
async function seedDatabase() {
    try {
        await db.authenticate();
        console.log('Connected to database for seeding.');
        
        // Try to seed users if User model exists (will be added in step 5)
        try {
            const { User } = require('./setup');
            const bcrypt = require('bcryptjs');
            const saltRounds = 10;
            
            // Hash passwords
            for (let user of sampleUsers) {
                user.password = await bcrypt.hash(user.password, saltRounds);
            }
            
            await User.bulkCreate(sampleUsers);
            console.log('Sample users inserted successfully.');
        } catch (error) {
            console.log('User model not found - skipping user seeding');
        }

        // Insert sample teams
        await Team.bulkCreate(sampleteams);
        console.log('Sample teams inserted successfully.');
        
        // Insert sample players
        await Player.bulkCreate(sampleplayers);
        console.log('Sample players inserted successfully.');
        
        await db.close();
        console.log('Database seeding completed.');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

seedDatabase();