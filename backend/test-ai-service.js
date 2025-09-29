// Test AIService class directly
require('dotenv').config({ path: '../.env' })
const { AIService } = require('./src/services/ai/AIService')

async function testAIService() {
  console.log('🤖 Testing AI Service Class Integration...\n')
  
  try {
    console.log('📋 Configuration Check:')
    console.log(`✅ API Key: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`)
    console.log(`✅ API URL: ${process.env.AMPLIFY_API_URL}`)
    console.log(`✅ Model: ${process.env.AMPLIFY_MODEL}`)
    console.log('')

    // Initialize AI Service
    console.log('🔧 Initializing AI Service...')
    const aiService = AIService.getInstance()
    console.log('✅ AI Service initialized successfully\n')

    // Test simple response without database (direct API test)
    console.log('📡 Testing direct API call...')
    
    // We'll test the private method by creating a simple test
    const messages = [
      {
        role: 'user',
        content: 'Hello! Can you help me with a simple test response?'
      }
    ]

    try {
      // Access the private method for testing
      const response = await aiService.callVanderbiltAPI(messages)
      console.log('✅ Direct API call successful!')
      console.log('📦 Response:', JSON.stringify(response, null, 2))
    } catch (apiError) {
      console.log('❌ Direct API call failed:', apiError.message)
      
      // Try a different approach - test with minimal parameters
      console.log('\n🔄 Trying with minimal parameters...')
      
      const minimalRequest = {
        model: 'GPT-4o-mini',
        messages: [{
          role: 'user',
          content: 'Hi'
        }],
        max_tokens: 50
      }
      
      console.log('📨 Minimal Request:', JSON.stringify(minimalRequest, null, 2))
      // This will help us see what's different in our approach
    }

  } catch (error) {
    console.error('❌ AI Service test failed:', error.message)
    
    if (error.message.includes('API key not configured')) {
      console.log('\n💡 Configuration Solutions:')
      console.log('1. Verify OPENAI_API_KEY is set in .env')
      console.log('2. Check if the API key format is correct')
      console.log('3. Ensure .env file is being loaded properly')
    }
  }
}

testAIService()