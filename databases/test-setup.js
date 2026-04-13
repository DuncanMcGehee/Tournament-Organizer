const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Create test database instance with unique name based on test file
const testDbName = process.env.JEST_WORKER_ID
  ? `test_tournament_teams_${process.env.JEST_WORKER_ID}.db`
  : 'test_tournament_teams.db';

const testDb = new Sequelize({
  dialect: 'sqlite',
  storage: path.join('database', testDbName),
  logging: false // Disable logging for tests
});

// Define Team model for tests
const TestTeam = testDb.define('Team', {
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
    },
    teamId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

// Define Player model for tests
const TestPlayer = testDb.define('Player', {
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
    teamId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

const TestUser = testDb.define('User', {
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

TestUser.hasMany(TestTeam, { foreignKey: 'userId' });
TestTeam.belongsTo(TestUser, { foreignKey: 'userId' });

TestTeam.hasMany(TestPlayer, { foreignKey: 'teamId' });
TestPlayer.belongsTo(TestTeam, { foreignKey: 'teamId' });

// Export for use in tests
module.exports = { testDb, TestTeam, TestPlayer, TestUser };