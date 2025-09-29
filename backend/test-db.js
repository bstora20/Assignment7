// Simple database connection test
require('dotenv').config({ path: '../.env' }) // Load .env from parent directory
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query successful:', result)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    
    // Common error solutions
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solutions:')
      console.log('1. Make sure MySQL is running')
      console.log('2. Check if the port (3306) is correct')
      console.log('3. Verify the host address')
    }
    
    if (error.message.includes('Access denied')) {
      console.log('\n💡 Solutions:')
      console.log('1. Check username and password')
      console.log('2. Verify user has permissions on the database')
      console.log('3. Make sure the database exists')
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()