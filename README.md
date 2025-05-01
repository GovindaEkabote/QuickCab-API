# 🚖 QuickCab - Ride-Hailing API

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-blue)

Backend API for a Uber-like ride-hailing service with driver management, ride booking, and admin controls.

## 📁 Project Structure 
<!-- 
quickcab-backend/
├── config/ # Environment configurations
│ ├── db.js # Database connection
│ └── cloudinary.js # File upload setup
│
├── controllers/ # Business logic
│ ├── user.controller.js
│ ├── ride.controller.js
│ └── admin.controller.js
│
├── middleware/ # Authentication & validation
│ ├── auth.middleware.js
│ ├── roles.middleware.js
│ └── errorHandler.js
│
├── models/ # MongoDB schemas
│ ├── User.model.js
│ ├── Ride.model.js
│ └── Transaction.model.js
│
├── routes/ # API endpoints
│ ├── user.routes.js
│ ├── ride.routes.js
│ └── admin.routes.js
│
├── services/ # Third-party integrations
│ ├── payment.service.js
│ ├── notification.service.js
│ └── slackNotifier.js
│
├── utils/ # Helper functions
│ ├── httpResponse.js
│ └── asyncHandler.js
│
├── .env.example # Environment variables template
├── server.js # Entry point
└── README.md # You are here
 -->

## 🔑 Key Features

- **User System**
  - JWT authentication
  - Role-based access (User/Driver/Admin)
  - Email/phone verification

- **Ride Management**
  - Real-time ride booking
  - Driver tracking
  - Fare estimation

- **Admin Controls**
  - Driver suspension/banning
  - Ride analytics
  - Financial reporting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas or local instance
- Redis (for caching)

### Installation
1. Clone repo:
   ```bash
   git clone https://github.com/yourusername/quickcab-backend.git


<!-- Install dependencies: -->
###  npm install
<!-- Configure environment:  -->
# Fill in your credentials
<!-- Start server: -->
npm run dev  # Development
npm start    # Production

### ✅ Commit Message Types (Conventional Commits Guide)

#### `feat`

- **Meaning**: A new feature
- **Example**: `feat: add user login functionality`

#### `fix`

- **Meaning**: A bug fix
- **Example**: `fix: resolve infinite loop in payment processing`

#### `docs`

- **Meaning**: Documentation changes
- **Example**: `docs: update API usage guide`

#### `style`

- **Meaning**: Code style/formatting changes (no functional impact)
- **Example**: `style: format code with Prettier`

#### `refactor`

- **Meaning**: Code restructuring (no new features or bug fixes)
- **Example**: `refactor: simplify authentication logic`

#### `perf`

- **Meaning**: Performance optimization
- **Example**: `perf: reduce database query time`

#### `test`

- **Meaning**: Test-related changes
- **Example**: `test: add unit tests for user validation`

#### `build`

- **Meaning**: Build system or dependency changes
- **Example**: `build: update webpack to v5`

#### `ci`

- **Meaning**: CI/CD pipeline changes
- **Example**: `ci: add GitHub Actions workflow`

#### `chore`

- **Meaning**: Maintenance tasks (e.g., updating configs)
- **Example**: `chore: update eslint config`

#### `revert`

- **Meaning**: Reverts a previous commit
- **Example**: `revert: remove experimental feature X`

<!-- To resolve the EsLint Issue -->

#### npm run lint:fix

<!-- command to run in production and development -->

### npm run dev --> development

### npm run start --> production


<!-- Twilio for OTP Verification -->
