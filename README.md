# LPG Tank Monitoring System

A full-stack LPG Tank Monitoring website with User and Admin roles.

## Features

- User registration and login
- JWT authentication
- Password hashing using bcryptjs
- User tank reading submission
- User-only transaction history
- Admin dashboard
- Admin can view, edit, delete, filter, and export all readings
- Automatic Normal / Warning / Critical status calculation
- Activity edit logs stored in each reading
- Chart.js dashboards
- Responsive dark industrial UI

## Safety Threshold Logic

The system calculates status automatically:

- Critical if pressure >= 160 PSI, temperature >= 55°C, LPG level >= 95%, or LPG level <= 10%
- Warning if pressure >= 120 PSI, temperature >= 45°C, LPG level >= 85%, or LPG level <= 20%
- Otherwise Normal

You can adjust these thresholds in:

- `routes/readingRoutes.js`
- `routes/adminRoutes.js`

## Installation Guide

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

```txt
http://localhost:5000
```

## MongoDB Setup Guide

1. Create a MongoDB Atlas account.
2. Create a free cluster.
3. Create a database user.
4. Allow access from your IP address, or use `0.0.0.0/0` for testing.
5. Copy your MongoDB connection string.
6. Put it inside `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lpg_monitoring
JWT_SECRET=your_long_random_secret
PORT=5000
```

## Admin Account Creation Guide

By default, registration creates a normal user only.

To make an account admin, use MongoDB Atlas:

1. Register normally on the website.
2. Go to MongoDB Atlas > Browse Collections > users.
3. Find the registered account.
4. Change:

```json
"role": "user"
```

into:

```json
"role": "admin"
```

5. Save the document.
6. Login again.

## Render Deployment Guide

1. Push this project to GitHub.
2. Go to Render.
3. Create New Web Service.
4. Connect your GitHub repository.
5. Use these settings:

```txt
Build Command: npm install
Start Command: npm start
```

6. Add environment variables in Render:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
NODE_ENV=production
```

7. Deploy.

## Project Structure

```txt
lpg-tank-monitoring-system/
├── server.js
├── package.json
├── .env.example
├── models/
│   ├── User.js
│   └── TankReading.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   ├── authRoutes.js
│   ├── readingRoutes.js
│   └── adminRoutes.js
└── public/
    ├── index.html
    ├── login.html
    ├── register.html
    ├── user-dashboard.html
    ├── admin-dashboard.html
    ├── style.css
    ├── script.js
    ├── user.js
    └── admin.js
```
