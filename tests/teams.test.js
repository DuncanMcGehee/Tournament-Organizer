const request = require('supertest');
const app = require('../server');
const { TestUser, TestTeam, testDb } = require('../databases/test-setup');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Teams API', () => {
    beforeAll(async () => {
        // Ensure test database is set up for this test suite
        await testDb.sync({ force: true });
    });

    afterAll(async () => {
        // Clean up database after all tests
        await testDb.close();
    });

    let authToken;
    let testUser;

    beforeEach(async () => {
        // Clear all tables before each test
        await testDb.truncate({ cascade: true });

        // Create a test user and get auth token
        testUser = await TestUser.create({
            name: 'Test User',
            email: 'test@example.com',
            password: await bcrypt.hash('password123', 10)
        });

        const loginResponse = await request(app)
            .post('/api/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        authToken = loginResponse.body.token;
    });

    describe('POST /api/teams', () => {
        it('should create a new team successfully', async () => {
            const teamData = {
                name: 'Test Team',
                record: '5-2',
                manager: 'John Doe',
                nextGame: '2024-12-25'
            };

            const response = await request(app)
                .post('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .send(teamData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Team created successfully');
            expect(response.body).toHaveProperty('team');
            expect(response.body.team).toHaveProperty('id');
            expect(response.body.team).toHaveProperty('name', teamData.name);
            expect(response.body.team).toHaveProperty('record', teamData.record);
            expect(response.body.team).toHaveProperty('manager', teamData.manager);
        });

        it('should return 400 if name is missing', async () => {
            const response = await request(app)
                .post('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ record: '5-2' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Name is required');
        });

        it('should return 401 if no auth token provided', async () => {
            const response = await request(app)
                .post('/api/teams')
                .send({ name: 'Test Team' })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Access token required');
        });
    });

    describe('GET /api/teams', () => {
        beforeEach(async () => {
            // Create test teams
            await TestTeam.create({
                name: 'Team Alpha',
                record: '5-2',
                manager: 'John Doe',
                teamId: testUser.id
            });
            await TestTeam.create({
                name: 'Team Beta',
                record: '3-4',
                manager: 'Jane Smith',
                teamId: testUser.id
            });
        });

        it('should get all teams for authenticated user', async () => {
            const response = await request(app)
                .get('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Teams retrieved successfully');
            expect(response.body).toHaveProperty('teams');
            expect(Array.isArray(response.body.teams)).toBe(true);
            expect(response.body.teams).toHaveLength(2);
            expect(response.body).toHaveProperty('total', 2);
        });

        it('should return 401 if no auth token provided', async () => {
            const response = await request(app)
                .get('/api/teams')
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Access token required');
        });
    });

    describe('GET /api/teams/:id', () => {
        let testTeam;

        beforeEach(async () => {
            testTeam = await TestTeam.create({
                name: 'Test Team',
                record: '5-2',
                manager: 'John Doe',
                teamId: testUser.id
            });
        });

        it('should get a specific team by id', async () => {
            const response = await request(app)
                .get(`/api/teams/${testTeam.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', testTeam.id);
            expect(response.body).toHaveProperty('name', testTeam.name);
            expect(response.body).toHaveProperty('record', testTeam.record);
            expect(response.body).toHaveProperty('manager', testTeam.manager);
        });

        it('should return 404 for non-existent team', async () => {
            const response = await request(app)
                .get('/api/teams/999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Team not found');
        });

        it('should return 401 if no auth token provided', async () => {
            const response = await request(app)
                .get(`/api/teams/${testTeam.id}`)
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Access token required');
        });
    });

    describe('PUT /api/teams/:id', () => {
        let testTeam;

        beforeEach(async () => {
            testTeam = await TestTeam.create({
                name: 'Original Team',
                record: '5-2',
                manager: 'John Doe',
                teamId: testUser.id
            });
        });

        it('should update a team successfully', async () => {
            const updateData = {
                name: 'Updated Team',
                record: '6-2',
                manager: 'Jane Doe'
            };

            const response = await request(app)
                .put(`/api/teams/${testTeam.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Team updated successfully');
            expect(response.body).toHaveProperty('team');
            expect(response.body.team).toHaveProperty('name', updateData.name);
            expect(response.body.team).toHaveProperty('record', updateData.record);
            expect(response.body.team).toHaveProperty('manager', updateData.manager);
        });

        it('should return 404 for non-existent team', async () => {
            const response = await request(app)
                .put('/api/teams/999')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Name' })
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Team not found');
        });
    });

    describe('DELETE /api/teams/:id', () => {
        let testTeam;

        beforeEach(async () => {
            testTeam = await TestTeam.create({
                name: 'Team to Delete',
                record: '5-2',
                manager: 'John Doe',
                teamId: testUser.id
            });
        });

        it('should delete a team successfully', async () => {
            const response = await request(app)
                .delete(`/api/teams/${testTeam.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Team deleted successfully');

            // Verify team is deleted
            const checkResponse = await request(app)
                .get(`/api/teams/${testTeam.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 404 for non-existent team', async () => {
            const response = await request(app)
                .delete('/api/teams/999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Team not found');
        });
    });
});