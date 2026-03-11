require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/dbconnection');
const archiveRoutes = require('./routes/archiveRoutes');

// Import AppError so your 404 handler doesn't crash!
// (Double check this path matches your folder structure)
const AppError = require('./utils/AppError');

const PORT = process.env.PORT || 5000;
const authController = require('./controller/authController');
const { protect } = require('./middleware/authMiddleware');
const globalErrorHandler = require('./middleware/errorMiddleware');
const taskRoutes = require('./routes/taskRoute');
const workspaceRoutes = require('./routes/workspaceRoutes');
const passport = require('passport');
const adminRoutes = require('./routes/adminRoutes');
const projectRouter = require('./routes/projectRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const activityRoutes = require('./routes/activityRoutes');
require('./config/passport');
connectDB();
const userRoutes = require('./routes/userRoutes');
const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Allow your Vite frontend
    credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

app.use('/api/archives', protect, archiveRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/projects', projectRouter);
app.use('/api/users', userRoutes);
app.use('/api/tasks', protect, taskRoutes);
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/activity', protect, activityRoutes);
// Auth Routes
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.patch('/api/auth/onboarding', protect, authController.completeOnboarding);

// Protected Routes
app.use('/api/tasks', protect, taskRoutes);
app.use('/api/workspaces', protect, workspaceRoutes);
app.use('/api/collaboration', collaborationRoutes);

// 404 Unhandled Route Catcher
// CHANGED: Using app.use() instead of app.all('*') prevents the regex crash
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
