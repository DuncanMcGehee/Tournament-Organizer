const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, User, Team } = require('./database/setup');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Add CORS middleware after your other implemented middleware
const cors = require('cors');
app.use(cors());

// Test database connection
async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Task API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Testing Renders auto-update/redeployment
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        message: 'Task API is running healthy',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});


// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Task Management API',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            teams: 'GET /api/teams',
            team: 'GET /api/teams/:id',
            players: 'GET /api/players',
            player: 'GET /api/players/:id',
            createGame : 'POST /api/games',
            createTeam: 'POST /api/teams',
            updateTeam: 'PUT /api/teams/:id',
            deleteGame: 'DELETE /api/games/:id',
            deleteTeam: 'DELETE /api/teams/:id'
        }
    });
});

// AUTHENTICATION ROUTES

// POST /api/register - Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Name, email, and password are required' 
            });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword
        });
        
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// POST /api/login - User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }
        
        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                name: user.name, 
                email: user.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        
        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// TASK ROUTES

// GET /api/teams - Get all teams for authenticated user
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            message: 'Teams retrieved successfully',
            teams: teams,
            total: teams.length
        });
        
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

// GET /api/teams/:id - Get single team
app.get('/api/teams/:id', async (req, res) => {
    try {
        const team = await Team.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });
        
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        res.json(team);
        
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});

// GET /api/players - Get all players for authenticated user
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
    
        res.json({
            message: 'Players retrieved successfully',
            players: players,
            total: players.length
        }); 
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// GET /api/players/:id - Get single player
app.get('/api/players/:id', async (req, res) => {
    try {
        const player = await Player.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

// POST /api/teams - Create new team
app.post('/api/teams', async (req, res) => {
    try {
        const { title, description, priority = 'medium' } = req.body;
        
        // Validate input
        if (!title) {
            return res.status(400).json({ 
                error: 'Title is required' 
            });
        }
        
        // Create team
        const newTeam = await Team.create({
            title,
            description,
            priority,
            userId: req.user.id
        });
        
        res.status(201).json({
            message: 'Team created successfully',
            team: newTeam
        });
        
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

// PUT /api/teams/:id - Update team
app.put('/api/teams/:id', async (req, res) => {
    try {
        const { title, description, completed, priority } = req.body;
        
        // Find team
        const team = await Team.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });
        
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        // Update team
        await team.update({
            title: title || team.title,
            description: description !== undefined ? description : team.description,
            completed: completed !== undefined ? completed : team.completed,
            priority: priority || team.priority
        });
        
        res.json({
            message: 'Team updated successfully',
            team: team
        });
        
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
});

// DELETE /api/games/:id - Delete game
app.delete('/api/games/:id', async (req, res) => {
    try {
        // Find game
        const game = await Game.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id
            }
        });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        // Delete game
        await game.destroy();
        res.json({
            message: 'Game deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).json({ error: 'Failed to delete game' });
    }
});

// DELETE /api/teams/:id - Delete team
app.delete('/api/teams/:id', async (req, res) => {
    try {
        // Find team
        const team = await Team.findOne({
            where: { 
                id: req.params.id,
                userId: req.user.id 
            }
        });
        
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        // Delete team
        await team.destroy();
        
        res.json({
            message: 'Team deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Failed to delete team' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        message: `${req.method} ${req.path} is not a valid endpoint`
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});