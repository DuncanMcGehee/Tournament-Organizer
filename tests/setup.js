// Test configuration and setup

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_NAME = 'test_tournament_teams.db';

// Note: Removed global database setup - each test suite handles its own setup