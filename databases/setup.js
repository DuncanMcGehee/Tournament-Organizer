const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const db = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_NAME
    ? `database/${process.env.DB_NAME}`
    : 'database/tournament_teams.db',
  logging: console.log
});

// Define Team model
const Team = db.define('Team', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    record: {
        type: DataTypes.TEXT
    },
    manager: {
        type: DataTypes.STRING,
        defaultValue: 'active'
    },
    nextGame: {
        type: DataTypes.DATE
    }
});

// Define Player model
const Player = db.define('Player', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    currentTeam: {
        type: DataTypes.STRING,
        allowNull: false
    },
    record: {
        type: DataTypes.TEXT
    },
    goals: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    saves: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    assists: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user'
    },
    teamId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

const User = db.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

User.hasMany(Team, { foreignKey: 'userId' });
Team.belongsTo(User, { foreignKey: 'userId' });

Team.hasMany(Player, { foreignKey: 'teamId' });
Player.belongsTo(Team, { foreignKey: 'teamId' });

// Export for use in other files
module.exports = { db, Team, Player, User, Sequelize };

// Create database and tables
async function setupDatabase() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
        
        await db.sync();
        console.log('Database and tables created successfully.');
        
        await db.close();
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}