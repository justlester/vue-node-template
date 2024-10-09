// index.js
'use strict';

require('module-alias/register');

// Import required dependencies
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const csrf = require('csrf');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
// const https = require('https');
// const fs = require('fs');
const path = require('path');

const ApiRoutes = require('@routes/index.js');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middlewares
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.CORS_WHITELIST
})); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies

// Rate Limiting Middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs,
    skipSuccessfulRequests: true
});
app.use(limiter);

// CSRF Protection
const csrfTokens = csrf();
// Middleware to generate CSRF token and set it in a cookie
app.use((req, res, next) => {
    let token = req.cookies.csrfToken;
    if (!token) {
        token = csrfTokens.create(CSRF_SECRET);
        res.cookie('csrfToken', token, {
            httpOnly: true,
            secure: process.env.HTTPS === 'true',
            sameSite: 'strict',
        });
    }
    next();
});

// Middleware to verify CSRF token for state-changing requests
app.use((req, res, next) => {
    // List of HTTP methods that modify state and should be protected
    const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    // Check if the request method requires CSRF verification
    if (stateChangingMethods.includes(req.method)) {
        const token = req.cookies.csrfToken;
        if (!token || !csrfTokens.verify(CSRF_SECRET, token)) {
            return res.status(403).json({ message: 'Invalid CSRF token' });
        }
    }

    next();
});


// Routes Here
app.use('/api', ApiRoutes);

// Serve static files from the dist folder
app.use(express.static(path.resolve(process.cwd(), 'dist')));

// Route all requests to the index.html file to enable client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
});


// HTTP Server setup
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

// HTTPS Server setup (uncomment and configure for production use)
/*
const httpsServer = https.createServer({
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem')
}, app);

httpsServer.listen(443, () => {
  console.log('HTTPS Server running on port 443');
});
*/
