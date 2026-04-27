Tournament Management API
A RESTful backend API for managing tournament teams and players. Built with Node.js, Express, Sequelize, SQLite, JWT authentication, and role-based authorization.

Features:
User registration and login
Password hashing with bcrypt
JWT-based authentication
Role-based access control (User / Admin)
Ownership-based data protection
CRUD operations for teams and players
Input validation using Joi
Secure database relationships (Users → Teams → Players)

Tech Stack:
Node.js, Express, Sequelize, SQLite, JWT, bcryptjs, Joi

Setup Instructions:
npm installnode server.js
Create a .env file:
NODE_ENV=developmentPORT=3000JWT_SECRET=your_secret_keyJWT_EXPIRES_IN=7dDB_NAME=tournament_teams.db
Server runs at:
http://localhost:3000

Authentication:
Register
POST /api/register
{  "name": "John",  "email": "john@test.com",  "password": "password123",  "role": "user"}
Login
POST /api/login
Returns JWT token:
{  "token": "JWT_TOKEN"}
Use token in all protected routes:
Authorization: Bearer <token>

Roles & Permissions:
User
Manage own teams and players
Cannot access other users’ data

Admin
Full access to all teams and players
Can delete any resource

API Endpoints:
Teams:
GET /api/teams → user’s teams / all (admin)
GET /api/teams/:id → single team (ownership required)
POST /api/teams → create team
PUT /api/teams/:id → update (owner/admin only)
DELETE /api/teams/:id → delete (owner/admin only)

Players:
GET /api/players → user’s players / all (admin)
GET /api/players/:id → single player
DELETE /api/player/:id → admin only

Security Features:
JWT authentication
bcrypt password hashing
Role-based access control
Ownership validation
Input validation (Joi)

Summary:
This API demonstrates secure backend development practices including authentication, authorization, and relational data modeling with protected CRUD operations.
If you want, I can also:
make this look like a perfect GitHub README with badges + layout
or help you write a project reflection paragraph (often extra credit style)
