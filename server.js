const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const Joi = require('joi');
const teamSchema = Joi.object({
    name: Joi.string().min(1).required(),
    record: Joi.string().allow('', null),
    manager: Joi.string().allow('', null),
    nextGame: Joi.date().optional()
});

// Conditionally import database models based on environment
let db, User, Team, Player;
if (process.env.NODE_ENV === 'test') {
  ({ testDb: db, TestTeam: Team, TestPlayer: Player, TestUser: User } = require('./databases/test-setup'));
} else {
  ({ db, User, Team, Player } = require('./databases/setup'));
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        next();
    };
};

app.use(express.json());

// Add CORS middleware after your other implemented middleware
const cors = require('cors');
app.use(cors());

// JWT Authentication middleware
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined");
    process.exit(1);
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    console.log("AUTH HEADER:", authHeader);

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Malformed Bearer token' });
    }

    const token = parts[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log("JWT ERROR:", err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    });
};

// Test database connection
async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
        
        if (process.env.NODE_ENV !== 'production') {
            await db.sync();
            console.log('Database tables synced successfully.');
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}


// Test database connection (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
    testConnection();
}


// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Tournament Management API',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            teams: 'GET /api/teams',
            team: 'GET /api/teams/:id',
            players: 'GET /api/players',
            player: 'GET /api/players/:id',
            createTeam: 'POST /api/teams',
            updateTeam: 'PUT /api/teams/:id',
            deletePlayer: 'DELETE /api/player/:id',
            deleteTeam: 'DELETE /api/teams/:id'
        }
    });
});

// AUTHENTICATION ROUTES

// POST /api/register - Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

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
            password: hashedPassword,
            role: role || 'user'
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
                email: user.email,
                role: user.role
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
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// TASK ROUTES

// GET /api/teams - Get all teams for authenticated user
app.get('/api/teams', authenticateToken, async (req, res) => {
    try {
        const teams = await Team.findAll({
            order: [['id', 'DESC']]
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
app.get('/api/teams/:teamId', authenticateToken, async (req, res) => {
    try {
        const team = await Team.findOne({
            where: {
                id: req.params.teamId,      // correct field
                userId: req.user.id         // ownership
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
app.get('/api/players', authenticateToken, async (req, res) => {
    try {
        const player = await Player.findAll({
            order: [['id', 'DESC']]
        });

        res.json({
            message: 'Player retrieved successfully',
            player: player,
            total: player.length
        });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// GET /api/players/:id - Get single player
app.get('/api/players/:id', authenticateToken, async (req, res) => {
    try {
        const player = await Player.findOne({
            where: {
                id: req.params.id
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
app.post('/api/teams', authenticateToken, async (req, res) => {
    const { error } = teamSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    try {
        const { name, record, manager, nextGame } = req.body;

        // Create team
        const newTeam = await Team.create({
            name,
            record,
            manager,
            nextGame,
            userId: req.user.id
        });
        
        res.status(201).json(newTeam);
        
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

// PUT /api/teams/:id - Update team
app.put('/api/teams/:id', authenticateToken, async (req, res) => {
    try {
        const team = await Team.findOne({
            where: { id: req.params.id }
        });

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // AUTHORIZATION CHECK (ADMIN OR OWNER)
        if (req.user.role !== 'admin' && team.userId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { error } = teamSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, record, manager, nextGame } = req.body;

        await team.update({
            name: name || team.name,
            record: record ?? team.record,
            manager: manager || team.manager,
            nextGame: nextGame || team.nextGame
        });

        res.json({
            message: 'Team updated successfully',
            team
        });

    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
});

// DELETE /api/player/:id - Delete player
app.delete('/api/player/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        // Find player
        const player = await Player.findOne({
            where: {
                id: req.params.id
            }
        });

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Delete player
        await player.destroy();

        res.json({
            message: 'Player deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

// DELETE /api/teams/:id - Delete team
app.delete('/api/teams/:id', authenticateToken, async (req, res) => {
    try {
        const team = await Team.findOne({
            where: { id: req.params.id }
        });

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // AUTH CHECK
        if (req.user.role !== 'admin' && team.userId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await team.destroy();

        res.json({ message: 'Team deleted successfully' });

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

// Start server (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });
}

// Export app for testing
module.exports = app;