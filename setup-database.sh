#!/bin/bash

echo "🗄️  Student Support Assistant - Database Setup"
echo "================================================"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL not found. Please install MySQL first."
    echo "   macOS: brew install mysql"
    echo "   Ubuntu: sudo apt install mysql-server"
    exit 1
fi

# Prompt for database credentials
read -p "Enter MySQL root password: " -s ROOT_PASSWORD
echo
read -p "Enter database name [student_support_assistant]: " DB_NAME
DB_NAME=${DB_NAME:-student_support_assistant}

read -p "Enter app username [student_app]: " APP_USER
APP_USER=${APP_USER:-student_app}

read -p "Enter app password: " -s APP_PASSWORD
echo

# Create database and user
echo "🔧 Creating database and user..."
echo "📝 Note: MySQL will prompt for the root password again for security..."
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$APP_USER'@'localhost' IDENTIFIED BY '$APP_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$APP_USER'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Database setup complete!' as result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database created successfully!"
    
    # Update .env file
    echo "🔧 Updating .env file..."
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"mysql://$APP_USER:$APP_PASSWORD@localhost:3306/$DB_NAME\"|" .env
    
    echo "✅ Configuration updated!"
    echo ""
    echo "Next steps:"
    echo "1. cd backend"
    echo "2. npm install"
    echo "3. npm run db:generate"
    echo "4. npm run db:migrate"
    echo "5. npm run dev"
else
    echo "❌ Database setup failed!"
fi