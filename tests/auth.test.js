const request = require('supertest');
const app = require('../server');
const { TestUser, testDb } = require('../databases/test-setup');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Authentication API', () => {
    beforeAll(async () => {
        console.log('Setting up test database...');
        // Ensure test database is set up for this test suite
        await testDb.sync({ force: true });
        console.log('Test database synced successfully');
    });

    afterAll(async () => {
        // Clean up database after all tests
        await testDb.close();
    });

    beforeEach(async () => {
        // Clear all tables before each test
        await testDb.truncate({ cascade: true });
    });

    describe('POST /api/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty('name', userData.name);
            expect(response.body.user).toHaveProperty('email', userData.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({ name: 'Test User' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Name, email, and password are required');
        });

        it('should return 400 if user already exists', async () => {
            // Create user first
            await TestUser.create({
                name: 'Existing User',
                email: 'existing@example.com',
                password: await bcrypt.hash('password123', 10)
            });

            const response = await request(app)
                .post('/api/register')
                .send({
                    name: 'New User',
                    email: 'existing@example.com',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'User with this email already exists');
        });
    });

    describe('POST /api/login', () => {
        it('should login successfully with correct credentials', async () => {
            // Create a test user
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                password: await bcrypt.hash('password123', 10)
            });

            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email', 'test@example.com');

            // Verify token is valid
            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
            expect(decoded).toHaveProperty('id');
            expect(decoded).toHaveProperty('email', 'test@example.com');
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ email: 'test@example.com' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Email and password are required');
        });

        it('should return 401 for invalid credentials', async () => {
            // Create a test user
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                password: await bcrypt.hash('password123', 10)
            });

            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid email or password');
        });

        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid email or password');
        });
    });
});