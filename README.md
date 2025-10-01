# Student Support Assistant

A full-stack web application that allows Student Support offices to create AI-powered assistants for common student questions. Built with Express.js, Next.js, MySQL, and integrated with Vanderbilt Amplify AI services.

## 🎯 Overview

The Student Support Assistant enables universities to:
- Create AI assistants for different departments (Academic Support, Financial Aid, Student Life, etc.)
- Upload documents (PDFs, Word docs, Excel files) to train assistants
- Provide 24/7 automated student chat support
- Monitor file changes automatically
- Run quality assurance tests
- View analytics and usage reports
- Send email notifications for important events

## 🏗️ Architecture

- **Frontend**: Next.js 13 with React, TypeScript, and TailwindCSS
- **Backend**: Express.js with TypeScript
- **Database**: MySQL with Prisma ORM
- **AI Integration**: Vanderbilt Amplify API (GPT-4o-mini model)
- **Authentication**: JWT-based with demo implementation
- **File Processing**: Support for PDF, DOC, DOCX, XLS, XLSX, TXT, CSV files
- **Real-time Features**: File watching with chokidar
- **Notifications**: Email notifications with nodemailer

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/)
- **npm** (comes with Node.js)

### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, or Linux
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: At least 2GB free space
- **Network**: Internet connection for AI API calls

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
```

### 2. Database Setup

#### Install and Configure MySQL

**macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Windows:**
1. Download MySQL installer from [mysql.com](https://dev.mysql.com/downloads/installer/)
2. Run installer and follow setup wizard
3. Start MySQL service from Services panel

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

#### Create Database and User

```bash
# Connect to MySQL as root
mysql -u root -p

# Create database and user
CREATE DATABASE student_support_assistant;
CREATE USER 'student_app'@'localhost' IDENTIFIED BY 'AppPass2024!Student';
GRANT ALL PRIVILEGES ON student_support_assistant.* TO 'student_app'@'localhost';
GRANT CREATE ON *.* TO 'student_app'@'localhost';  # For Prisma shadow database
FLUSH PRIVILEGES;
EXIT;
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cd backend
cp .env.example .env  # If example exists, or create new file
```

Edit `backend/.env`:

```env
# Database Configuration
DATABASE_URL="mysql://student_app:AppPass2024!Student@localhost:3306/student_support_assistant"

# Backend Configuration  
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001

# AI Configuration - Vanderbilt Amplify
OPENAI_API_KEY=your-vanderbilt-amplify-api-key
AMPLIFY_API_URL=https://prod-api.vanderbilt.ai
AMPLIFY_MODEL=GPT-4o-mini

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Student Support Assistant <noreply@youruniversity.edu>"

# File Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB
WATCH_PATHS=./watched_folders

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

Create frontend environment file:

```bash
cd ../frontend
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 4. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend  
npm install
```

### 5. Database Migration

```bash
cd ../backend
npx prisma generate
npx prisma db push
```

Verify the migration worked:
```bash
mysql -u student_app -p student_support_assistant -e "SHOW TABLES;"
```

You should see 11 tables created.

### 6. Start the Application

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# OR for simplified version:
node simple-server.js
```

**Terminal 2 - Frontend:**  
```bash
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend Interface**: http://localhost:3001
- **Backend Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000 (lists available endpoints)

## 📖 Usage Guide

### First Time Setup

1. **Visit Application**: Go to http://localhost:3001
2. **Register Account**: Click "Create account" and fill out registration form
3. **Login**: Use any valid email format and password (demo authentication)
4. **Explore Dashboard**: Navigate through different sections using the sidebar

### Key Features

#### 🤖 Managing AI Assistants
- **View Assistants**: Dashboard shows all created assistants
- **Create New**: Click "Create New Assistant" to set up department-specific helpers
- **Configure**: Upload documents to train each assistant
- **Test**: Run quality assurance tests to verify responses

#### 📄 Document Management  
- **Upload Files**: Support for PDF, Word, Excel, text files
- **Auto-Processing**: Documents are automatically processed and indexed
- **File Watching**: Place files in `backend/watched_folders` for automatic detection
- **Status Tracking**: Monitor processing status in real-time

#### 💬 Student Chat Interface
- **Public URLs**: Each assistant gets a shareable URL like `/chat/academic-support`
- **24/7 Availability**: Students can get help anytime
- **Smart Responses**: AI provides contextual answers based on uploaded documents

#### 📊 Analytics & Reports
- **Usage Statistics**: Track conversations, popular questions, response accuracy
- **Performance Metrics**: Monitor assistant effectiveness
- **Export Data**: Download reports for analysis

#### 🧪 Quality Assurance
- **Test Suites**: Create test cases for each assistant
- **Automated Testing**: Run tests automatically when documents change
- **Results Tracking**: Monitor test pass/fail rates over time

## 🛠️ Development

### Project Structure

```
student-support-assistant/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Helper functions
│   ├── prisma/             # Database schema & migrations
│   ├── uploads/            # File upload storage
│   ├── watched_folders/    # Auto-monitored directories
│   ├── logs/               # Application logs
│   └── simple-server.js    # Simplified development server
├── frontend/               # Next.js React application
│   ├── pages/              # Next.js pages & routing
│   ├── components/         # React components
│   ├── lib/                # Utilities & auth
│   └── styles/             # CSS & styling
└── README.md               # This file
```

### Available Scripts

**Backend:**
```bash
npm run dev         # Start development server with TypeScript
npm run build       # Build for production
npm start           # Start production server
npm run db:migrate  # Run database migrations
npm test            # Run tests
node simple-server.js  # Start simplified demo server
```

**Frontend:**
```bash
npm run dev         # Start Next.js development server
npm run build       # Build for production  
npm start           # Start production server
npm run lint        # Run ESLint
```

### Testing Endpoints

Test the backend API:
```bash
# Health check
curl http://localhost:3000/health

# List assistants
curl http://localhost:3000/api/assistants

# Test database
curl http://localhost:3000/api/database/test
```

## 🔧 Configuration

### AI Integration Setup

1. **Get Vanderbilt Amplify Access**:
   - Contact your institution's IT department
   - Request API key for Vanderbilt Amplify
   - Ensure access to GPT-4o-mini model

2. **Update Configuration**:
   ```env
   OPENAI_API_KEY=your-amplify-key-here
   AMPLIFY_API_URL=https://prod-api.vanderbilt.ai
   AMPLIFY_MODEL=GPT-4o-mini
   ```

### Email Notifications Setup

1. **Gmail Setup**:
   - Enable 2-factor authentication
   - Generate app-specific password
   - Update SMTP settings in `.env`

2. **Other Email Providers**:
   - Update SMTP_HOST, SMTP_PORT accordingly
   - Ensure authentication credentials are correct

### File Upload Configuration

Adjust file upload limits in `.env`:
```env
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads
```

## 🚨 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify MySQL is running: `brew services list | grep mysql`
- Check credentials in DATABASE_URL
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

**"Port already in use"**
- Kill existing processes: `lsof -ti:3000 | xargs kill -9`
- Change port in .env file

**"Invalid date errors"**
- Clear browser localStorage
- Restart backend server
- Check data formats in API responses

**"401 Authentication errors"**
- Clear browser localStorage: DevTools → Application → Local Storage
- Use logout button in Settings page
- Verify token format in backend

**TypeScript compilation errors**
- Use `node simple-server.js` instead of `npm run dev`
- Check tsconfig.json settings
- Ensure all dependencies are installed

### Getting Help

1. **Check Logs**: 
   - Backend: `backend/logs/app.log`
   - Frontend: Browser console (F12)

2. **Verify Setup**:
   ```bash
   # Test database connection
   cd backend && node test-db.js
   
   # Test API endpoints
   curl http://localhost:3000/health
   ```

3. **Reset Application**:
   - Clear browser data completely
   - Restart both servers
   - Re-run database migrations

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user info

### Assistant Management

- `GET /api/assistants` - List all assistants
- `POST /api/assistants` - Create new assistant
- `GET /api/assistants/:id` - Get assistant details
- `PUT /api/assistants/:id` - Update assistant
- `DELETE /api/assistants/:id` - Delete assistant

### Document Management  

- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload documents
- `DELETE /api/documents/:id` - Delete document

### Chat & Analytics

- `POST /api/chat` - Send message to assistant
- `GET /api/analytics` - Get usage analytics
- `GET /api/analytics/dashboard` - Dashboard metrics

## 🚀 Deployment

### Production Checklist

- [ ] Update JWT_SECRET to secure random string
- [ ] Configure production database
- [ ] Set NODE_ENV=production
- [ ] Configure proper SMTP settings
- [ ] Set up SSL/HTTPS
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up monitoring and logging
- [ ] Test all functionality in production environment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=mysql://user:pass@production-db:3306/dbname
JWT_SECRET=super-secure-random-string-minimum-32-characters
NEXT_PUBLIC_API_URL=https://yourdomain.com
AMPLIFY_API_URL=https://prod-api.vanderbilt.ai
```

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## 📞 Support

- **Technical Issues**: Contact your system administrator
- **Feature Requests**: Create an issue in the repository
- **Documentation**: Refer to this README or inline code comments

---

**Built with ❤️ for student success**
