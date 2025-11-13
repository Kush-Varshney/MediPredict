# 📝 MediPredict

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=flat-square&logo=github)](https://github.com/Kush-Varshney/MediPredict)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.3.1-blue)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.2-black)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-000000?logo=flask)](https://flask.palletsprojects.com/)

> **Transforming Health Confusion into Clarity** - A comprehensive full-stack AI healthcare assistant that combines Machine Learning precision with Google Gemini's natural intelligence to deliver meaningful, trustworthy, and personalized health guidance.

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📁 Project Structure](#-project-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [📊 Dataset](#-dataset)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [📚 API Documentation](#-api-documentation)
- [🔒 Security Features](#-security-features)
- [🧪 Testing](#-testing)
- [🐛 Troubleshooting](#-troubleshooting)
- [🚀 Deployment](#-deployment)
- [✨ Recent Updates](#-recent-updates)
- [🛣️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [👥 Team](#-team)
- [📄 License](#-license)

## 🌟 Features

### 🔐 Authentication & Security

- **JWT-based authentication** with secure token management
- **Secure password hashing** using bcrypt
- **Rate limiting** and security headers
- **Input validation** and sanitization
- **CORS protection** and Helmet security headers
- **Protected API routes** with authentication middleware

### 🤖 AI-Powered Disease Prediction

- **Multi-model ML predictions** using Decision Tree, Random Forest, SVM, and Gradient Boosting
- **Symptom-based analysis** with comprehensive disease matching
- **Health metrics integration** (blood pressure, glucose, cholesterol)
- **Confidence scoring** for predictions
- **Risk level assessment** (Low, Medium, High)

### 💡 Intelligent Health Guidance

- **Google Gemini AI integration** for natural language explanations
- **Personalized precautions** based on predicted disease
- **Dietary recommendations** tailored to health conditions
- **AI-generated insights** explaining predictions in plain language
- **Context-aware guidance** considering user's health metrics

### 📊 Health Metrics & Trends

- **Health Metrics Overview** with current vital signs
- **Status indicators** (Normal, Elevated, High) for each metric
- **Historical trends** showing average values from predictions
- **Visual health summaries** with clear status badges
- **Target ranges** for easy comparison

### 📝 Prediction History

- **Complete prediction history** for authenticated users
- **Dashboard view** with all previous predictions
- **Search and filter** capabilities
- **Detailed prediction records** with timestamps
- **Health trends analysis** over time

### 🎨 User Interface

- **Responsive design** with Tailwind CSS
- **Modern UI components** with clean medical theme
- **Mobile-first** approach
- **Loading states** and error handling
- **Accessibility** compliant
- **Intuitive navigation** and user experience

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                        │
│              (Next.js/React Frontend)                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes                         │
│         (Authentication Proxy Layer)                    │
└────────────────────┬────────────────────────────────────┘
                     │ Internal HTTP
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Express.js Backend Server                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Routes: /api/predict, /api/auth, /api/user      │  │
│  │  Middleware: JWT Auth, Rate Limiting, Validation │  │
│  └──────────────────────────────────────────────────┘  │
└─────┬───────────────────────────────┬───────────────────┘
      │                               │
      │ HTTP                           │ HTTP
      ▼                               ▼
┌──────────────┐              ┌──────────────┐
│ Flask ML     │              │ Google       │
│ Service      │              │ Gemini API   │
│ (Python)     │              │              │
│              │              │              │
│ - Predict    │              │ - Explanations│
│ - Evaluate   │              │ - Precautions │
│ - Explain    │              │ - Diet Plans  │
└──────┬───────┘              └──────────────┘
       │
       │ MongoDB
       ▼
┌──────────────┐
│  MongoDB     │
│  Database    │
│              │
│ - Users      │
│ - Predictions│
│ - History    │
└──────────────┘
```

### Data Flow

1. **User submits prediction form** → Frontend validates input
2. **Next.js API route** → Proxies request with authentication
3. **Express backend** → Validates request and calls ML service
4. **Flask ML service** → Processes symptoms and health metrics
5. **ML model prediction** → Returns disease, confidence, risk level
6. **Gemini API call** → Generates AI explanations and guidance
7. **Response to frontend** → Displays prediction and insights
8. **MongoDB storage** → Saves prediction history for user

## 📁 Project Structure

```
medipredict/
├── 📁 app/                          # Next.js Frontend Application
│   ├── 📁 api/                      # API route handlers (proxy layer)
│   │   ├── 📁 auth/                 # Authentication endpoints
│   │   │   ├── login/route.ts
│   │   │   └── signup/route.ts
│   │   ├── 📁 predict/              # Prediction endpoints
│   │   │   └── route.ts
│   │   └── 📁 predictions/          # History endpoints
│   │       └── history/route.ts
│   ├── 📁 auth/                     # Authentication pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── 📁 dashboard/                # User dashboard
│   │   └── page.tsx
│   ├── page.tsx                     # Home page
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
│
├── 📁 components/                   # React Components
│   ├── 📁 ui/                       # Reusable UI components
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── tabs.tsx
│   ├── error-boundary.tsx           # Error handling
│   ├── header.tsx                   # Navigation header
│   ├── health-insights.tsx          # AI-generated insights
│   ├── health-insights-placeholder.tsx
│   ├── health-trends.tsx            # Health metrics trends
│   ├── prediction-results.tsx       # Prediction display
│   └── symptom-form.tsx             # Input form
│
├── 📁 lib/                          # Utility libraries
│   └── http.ts                      # HTTP client utilities
│
├── 📁 server/                       # Node.js Backend Application
│   └── 📁 src/
│       ├── 📁 middleware/           # Express middleware
│       │   └── auth.js              # JWT authentication
│       ├── 📁 models/               # MongoDB models
│       │   ├── Prediction.js        # Prediction schema
│       │   └── User.js              # User schema
│       ├── 📁 routes/               # API route handlers
│       │   ├── auth.js              # Authentication routes
│       │   ├── predict.js           # Prediction routes
│       │   └── user.js              # User management
│       ├── 📁 services/             # Business logic services
│       │   └── gemini.js            # Gemini API integration
│       └── index.js                 # Express server setup
│
├── 📁 ml/                           # Machine Learning Service
│   ├── 📁 src/
│   │   ├── 📁 api/                  # Flask API endpoints
│   │   │   ├── app.py               # Flask application
│   │   │   ├── predictor.py         # Prediction logic
│   │   │   └── validators.py        # Input validation
│   │   ├── 📁 models/               # ML model training
│   │   │   ├── evaluator.py         # Model evaluation
│   │   │   └── model_trainer.py     # Model training
│   │   └── 📁 preprocessing/        # Data preprocessing
│   │       └── data_loader.py       # Data loading utilities
│   ├── 📁 data/                     # Dataset storage
│   │   └── Final_Augmented_dataset_Diseases_and_Symptoms.csv
│   ├── 📁 models/                   # Trained models (gitignored)
│   │   ├── model.pkl
│   │   ├── scaler.pkl
│   │   └── label_encoders.pkl
│   ├── train.py                     # Model training script
│   ├── setup_kaggle_dataset.py      # Dataset download script
│   └── requirements.txt             # Python dependencies
│
├── 📄 package.json                  # Frontend dependencies
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 tailwind.config.ts            # Tailwind CSS configuration
├── 📄 next.config.js                # Next.js configuration
├── 📄 .gitignore                    # Git ignore rules
├── 📄 README.md                     # Project documentation
└── 📄 LICENSE                       # MIT License
```

### 📂 Key Directories Explained

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **`app/`** | Next.js frontend application | Pages, API routes, layouts |
| **`components/`** | Reusable React components | UI components, feature components |
| **`server/src/routes/`** | API endpoints | Authentication, predictions, user management |
| **`server/src/models/`** | Database schemas | User, Prediction models |
| **`server/src/services/`** | Business logic | Gemini API integration |
| **`ml/src/api/`** | Flask ML service | Prediction endpoints, validators |
| **`ml/src/models/`** | ML model training | Model trainer, evaluator |
| **`ml/data/`** | Dataset storage | Diseases and symptoms dataset |

## 🛠️ Tech Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend Framework** | Next.js | 14.2.5 | React framework with App Router |
| **UI Library** | React | 18.3.1 | User interface components |
| **Language** | TypeScript | 5.6 | Type-safe development |
| **Styling** | Tailwind CSS | 3.4 | Utility-first CSS framework |
| **Backend** | Node.js | 18+ | Runtime environment |
| **Web Framework** | Express.js | 4.18.2 | API server |
| **Database** | MongoDB | 7.0 | Data storage (via Mongoose) |
| **Authentication** | JWT | 9.0.2 | Token-based authentication |
| **ML Runtime** | Python | 3.9+ | Machine learning execution |
| **ML Framework** | Flask | 2.0+ | ML API service |
| **ML Library** | Scikit-learn | Latest | ML models and algorithms |
| **Data Processing** | Pandas/NumPy | Latest | Data manipulation |
| **AI Integration** | Google Gemini API | Latest | Natural language explanations |
| **HTTP Client** | Axios | 1.3.0 | HTTP requests |

## 📊 Dataset

The system uses a comprehensive **Diseases and Symptoms Dataset** from Kaggle for training:

### Diseases and Symptoms Dataset

- **Source**: [Kaggle - Diseases and Symptoms Dataset](https://www.kaggle.com/datasets/dhivyeshrk/diseases-and-symptoms-dataset)
- **Description**: Comprehensive disease-symptom mapping with binary symptom indicators
- **Features**:
  - Multiple disease categories
  - Binary symptom encoding (0/1 for each symptom)
  - Comprehensive symptom vocabulary
  - Augmented dataset for better model training
- **Usage**: Primary dataset for training ML models to predict diseases based on symptoms
- **Format**: CSV with disease names and binary symptom indicators

### Dataset Setup

The dataset is automatically downloaded using the Kaggle API during setup. See [Quick Start](#-quick-start) for instructions.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.9 or higher)
- **MongoDB** (local installation or Atlas cloud)
- **Kaggle API** credentials (for dataset download)
- **Google Gemini API** key (for AI explanations)
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Kush-Varshney/MediPredict.git
   cd MediPredict
   ```

2. **Install Frontend Dependencies**

   ```bash
   npm install
   ```

3. **Install Backend Dependencies**

   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Setup Python ML Service**

   ```bash
   cd ml
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

5. **Setup Kaggle API** (for dataset download)

   ```bash
   # Install Kaggle CLI
   pip install kaggle
   
   # Setup Kaggle credentials
   # Download kaggle.json from https://www.kaggle.com/settings
   mkdir -p ~/.kaggle
   cp kaggle.json ~/.kaggle/
   chmod 600 ~/.kaggle/kaggle.json
   ```

6. **Download Dataset**

   ```bash
   cd ml
   python setup_kaggle_dataset.py
   cd ..
   ```

7. **Train ML Models**

   ```bash
   cd ml
   python train.py
   cd ..
   ```

### ⚙️ Configuration

#### Frontend Environment Variables

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

#### Backend Environment Variables

Create `.env` file in the `server` directory:

```env
NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://localhost:27017/medipredict
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
ML_SERVICE_URL=http://127.0.0.1:5001
GEMINI_API_KEY=your-google-gemini-api-key
```

#### ML Service Environment Variables

Create `.env` file in the `ml` directory:

```env
FLASK_ENV=development
FLASK_PORT=5001
MODEL_PATH=./models/model.pkl
```

### Start Development Servers

1. **Start MongoDB** (if running locally)

   ```bash
   mongod
   ```

2. **Start ML Service**

   ```bash
   cd ml
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python src/api/app.py
   ```

3. **Start Backend Server**

   ```bash
   cd server
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

4. **Start Frontend**

   ```bash
   npm run dev
   ```

### 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:5001
- **Health Check**: http://localhost:3001/api/health
- **ML Health Check**: http://localhost:5001/health

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access | Request Body |
|--------|----------|-------------|---------|--------------|
| `POST` | `/api/auth/login` | User login | Public | `{email, password}` |
| `POST` | `/api/auth/signup` | Register new user | Public | `{name, email, password}` |
| `GET` | `/api/auth/me` | Get current user profile | Authenticated | - |

### Prediction Endpoints

| Method | Endpoint | Description | Access | Request Body |
|--------|----------|-------------|---------|--------------|
| `POST` | `/api/predict` | Make disease prediction | Authenticated | `{age, gender, weight, bloodPressureSystolic, bloodPressureDiastolic, glucose, cholesterol, symptoms[]}` |
| `GET` | `/api/predict/history` | Get prediction history | Authenticated | Query params: `limit`, `skip` |
| `GET` | `/api/predict/:id` | Get single prediction | Authenticated | - |
| `DELETE` | `/api/predict/:id` | Delete prediction | Authenticated | - |

### User Management

| Method | Endpoint | Description | Access | Request Body |
|--------|----------|-------------|---------|--------------|
| `GET` | `/api/user/profile` | Get user profile | Authenticated | - |
| `PUT` | `/api/user/profile` | Update user profile | Authenticated | `{name, age, gender, weight, height}` |
| `GET` | `/api/user/stats` | Get user statistics | Authenticated | - |

### Health Check Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/api/health` | Backend health check | Public |
| `GET` | `/api/health/ml` | ML service health check | Public |

## 🔒 Security Features

### Implemented Security Measures

- ✅ JWT token authentication with secure secrets
- ✅ Password hashing using bcrypt
- ✅ Input validation and sanitization
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Protected API routes
- ✅ Environment variable protection
- ✅ SQL injection prevention (MongoDB)
- ✅ XSS protection

### Production Security Checklist

- [ ] Use strong, unique JWT secrets
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Implement proper logging and monitoring
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Implement proper error handling
- [ ] Set up monitoring and alerting
- [ ] Use environment-specific configurations
- [ ] Implement API key rotation

## 🧪 Testing

### Manual Testing Scenarios

1. **Authentication Testing**
   - User registration and login
   - Token validation
   - Protected route access
   - Password security

2. **Prediction Testing**
   - Symptom-based predictions
   - Health metrics integration
   - Multiple model predictions
   - Confidence scoring

3. **AI Integration Testing**
   - Gemini API responses
   - Explanation generation
   - Precautions and diet recommendations
   - Error handling for API failures

4. **Health Metrics Testing**
   - Metrics display
   - Status indicators
   - Historical trends
   - Data persistence

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><strong>MongoDB Connection Error</strong></summary>

**Symptoms**: Server fails to start, database connection errors

**Solutions**:
- Ensure MongoDB is running locally or check cloud connection
- Verify connection string in `.env` file
- Check network connectivity and firewall settings
- Verify MongoDB credentials and permissions
- Check if MongoDB service is running: `mongod --version`

</details>

<details>
<summary><strong>ML Service Not Responding</strong></summary>

**Symptoms**: Predictions fail, ML service unreachable errors

**Solutions**:
- Verify ML service is running on port 5001
- Check `ML_SERVICE_URL` in server `.env` file
- Ensure Python virtual environment is activated
- Verify model files exist in `ml/models/` directory
- Check ML service logs for errors
- Test ML service directly: `curl http://localhost:5001/health`

</details>

<details>
<summary><strong>Gemini API Errors</strong></summary>

**Symptoms**: AI explanations missing, API errors

**Solutions**:
- Verify `GEMINI_API_KEY` is set in server `.env`
- Check API key validity and quota
- Ensure internet connectivity
- Check API response logs
- Verify API key permissions

</details>

<details>
<summary><strong>CORS Errors</strong></summary>

**Symptoms**: Frontend can't connect to backend, CORS policy errors

**Solutions**:
- Check `NEXT_PUBLIC_SERVER_URL` in frontend `.env.local`
- Verify backend CORS configuration
- Ensure both servers are running on correct ports
- Check browser console for specific CORS errors

</details>

<details>
<summary><strong>Authentication Issues</strong></summary>

**Symptoms**: Login fails, token errors, unauthorized access

**Solutions**:
- Check JWT secret configuration in `.env`
- Verify token expiration settings
- Clear browser localStorage and cookies
- Check if user exists in database
- Verify password hashing is working

</details>

<details>
<summary><strong>Dataset Download Issues</strong></summary>

**Symptoms**: Training fails, dataset not found

**Solutions**:
- Verify Kaggle API credentials are set up correctly
- Check `kaggle.json` file location and permissions
- Ensure dataset name is correct
- Check internet connectivity
- Verify Kaggle API quota

</details>

## 🚀 Deployment

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Deploy**

   ```bash
   vercel --prod
   ```

3. **Environment Variables** (Set in Vercel Dashboard)
   - `NEXT_PUBLIC_SERVER_URL=<your-backend-url>`

### Backend Deployment

#### Option 1: Vercel Serverless Functions

1. Deploy backend as Vercel serverless functions
2. Set environment variables in Vercel dashboard
3. Update frontend API URL

#### Option 2: Traditional Server (PM2, Docker, etc.)

1. **Using PM2**

   ```bash
   cd server
   npm install -g pm2
   pm2 start src/index.js --name medipredict-api
   pm2 save
   pm2 startup
   ```

2. **Using Docker**

   ```bash
   docker build -t medipredict-server .
   docker run -p 3001:3001 medipredict-server
   ```

### ML Service Deployment

1. **Using Gunicorn**

   ```bash
   cd ml
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5001 src.api.app:app
   ```

2. **Using Docker**

   ```bash
   docker build -t medipredict-ml -f ml/Dockerfile .
   docker run -p 5001:5001 medipredict-ml
   ```

### Database Setup (Production)

- Use MongoDB Atlas or another cloud MongoDB service
- Update `MONGO_URI` in your environment variables
- Enable authentication and IP whitelisting
- Set up regular backups

### Environment Variables (Production)

Ensure all environment variables are set:
- `NODE_ENV=production`
- `MONGO_URI=<production-mongodb-uri>`
- `JWT_SECRET=<strong-production-secret>`
- `ML_SERVICE_URL=<ml-service-url>`
- `GEMINI_API_KEY=<gemini-api-key>`

## ✨ Recent Updates

### UI/UX Improvements
- **Simplified Login UI**: Removed redundant login/signin buttons - now only shown in header for better UX
- **Health Metrics Overview**: Fixed display issue and improved metric extraction logic
- **Health Trends**: Simplified from complex sparkline charts to clear average value cards
- **Removed Medication Reminders**: Feature removed as per user feedback

### Code Cleanup
- Removed all debugging console.log statements
- Cleaned up unnecessary code and files
- Improved error handling and data flow
- Better metric extraction with support for both camelCase and snake_case

### Features
- **Authentication Required**: All prediction features now require user authentication
- **Health Metrics Display**: Shows blood pressure, glucose, and cholesterol with status indicators
- **Prediction History**: View and track all previous predictions in dashboard
- **Health Trends Summary**: Average values from prediction history

## 🛣️ Roadmap

### Phase 1 - Core Features ✅

- [x] Multi-model ML predictions
- [x] User authentication and authorization
- [x] Disease prediction based on symptoms
- [x] Google Gemini AI integration
- [x] Health metrics tracking
- [x] Prediction history

### Phase 2 - Enhanced Features 🚧

- [ ] Advanced model interpretability (SHAP/LIME)
- [ ] Real-time health monitoring
- [ ] Export functionality for predictions
- [ ] Email notifications for health alerts
- [ ] Mobile application (React Native)

### Phase 3 - Advanced Features 📋

- [ ] Integration with wearable devices
- [ ] Telemedicine features
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Family health tracking

### Phase 4 - Enterprise Features 🔮

- [ ] Healthcare provider integration
- [ ] EHR (Electronic Health Records) integration
- [ ] HIPAA compliance features
- [ ] Advanced security and audit logging
- [ ] Enterprise support and SLA

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**

   ```bash
   git clone https://github.com/Kush-Varshney/MediPredict.git
   cd MediPredict
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**

   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Commit your changes**

   ```bash
   git commit -m 'Add some amazing feature'
   ```

5. **Push to the branch**

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Add comprehensive tests for new features
- Update documentation and README as needed
- Ensure all tests pass before submitting
- Write clear commit messages
- Keep pull requests focused and atomic
- Test thoroughly before submitting

## 👥 Team

MediPredict is developed by a dedicated team of developers passionate about leveraging AI and machine learning to improve healthcare accessibility and outcomes.

### Our Mission

To transform health confusion into clarity by providing intelligent, accessible, and trustworthy disease prediction and health guidance through cutting-edge AI technology.

### Technologies We Use

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB
- **Machine Learning**: Python, Flask, Scikit-learn
- **AI Integration**: Google Gemini API

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- 🐛 **Bug Reports**: [Create an issue](https://github.com/Kush-Varshney/MediPredict/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/Kush-Varshney/MediPredict/discussions)
- 📧 **Contact**: [GitHub Repository](https://github.com/Kush-Varshney/MediPredict)
- 💬 **Questions**: Open a discussion on GitHub

## ⭐ Show Your Support

If you found this project helpful, please give it a ⭐ on GitHub!

---

<div align="center">

**Built with ❤️ using MERN Stack + Machine Learning**

[![Made with React](https://img.shields.io/badge/Made%20with-React-61dafb?logo=react)](https://reactjs.org/)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-000000?logo=next.js)](https://nextjs.org/)
[![Made with Node.js](https://img.shields.io/badge/Made%20with-Node.js-339933?logo=node.js)](https://nodejs.org/)
[![Made with MongoDB](https://img.shields.io/badge/Made%20with-MongoDB-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Made with Express](https://img.shields.io/badge/Made%20with-Express-000000?logo=express)](https://expressjs.com/)
[![Made with Python](https://img.shields.io/badge/Made%20with-Python-3776AB?logo=python)](https://www.python.org/)
[![Made with Flask](https://img.shields.io/badge/Made%20with-Flask-000000?logo=flask)](https://flask.palletsprojects.com/)
[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)

</div>
