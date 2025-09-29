// Test Vanderbilt Amplify AI functionality
require('dotenv').config({ path: '../.env' })
const axios = require('axios')

async function testVanderbiltAmplify() {
  console.log('🏫 Testing Vanderbilt Amplify Integration...\n')
  
  // Check configuration
  const apiKey = process.env.OPENAI_API_KEY || process.env.AMPLIFY_API_KEY;
  const apiURL = process.env.AMPLIFY_API_URL;
  const model = process.env.AMPLIFY_MODEL;
  
  console.log('📋 Configuration:')
  console.log(`✅ API Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET'}`)
  console.log(`✅ API URL: ${apiURL}`)
  console.log(`✅ Model: ${model}`)
  console.log('')
  
  if (!apiKey) {
    console.log('❌ API Key not configured')
    return
  }
  
  try {
    console.log('📡 Testing Vanderbilt Amplify API connection...\n')
    
    const testMessage = 'Hello! What are your office hours and how can students get help with financial aid?'
    
    const requestData = {
      model: model,
      messages: [
        {
          role: 'user',
          content: testMessage
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
      stream: false
    }
    
    console.log('🔗 Calling:', `${apiURL}/chat`)
    console.log('📨 Request:', JSON.stringify(requestData, null, 2))
    console.log('')
    
    const response = await axios.post(`${apiURL}/chat`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey,
        'User-Agent': 'StudentSupportAssistant/1.0'
      },
      timeout: 30000
    })
    
    console.log('✅ Success! Response received:')
    console.log('📊 Status:', response.status)
    console.log('📦 Response Data:')
    console.log(JSON.stringify(response.data, null, 2))
    console.log('')
    
    // Extract content based on response format
    let content = ''
    let usage = {}
    
    if (response.data.choices && Array.isArray(response.data.choices)) {
      // OpenAI-style format
      content = response.data.choices[0]?.message?.content || response.data.choices[0]?.text || ''
      usage = response.data.usage || {}
    } else if (response.data.content) {
      content = response.data.content
    } else if (response.data.message) {
      content = response.data.message
    } else if (response.data.response) {
      content = response.data.response
    }
    
    if (content) {
      console.log('🎯 Extracted Content:')
      console.log('---')
      console.log(content)
      console.log('---')
      console.log('')
      
      if (Object.keys(usage).length > 0) {
        console.log('📊 Token Usage:', usage)
        console.log('')
      }
      
      // Test document analysis capability
      console.log('📄 Testing document analysis with sample content...\n')
      
      const documentAnalysisRequest = {
        model: model,
        messages: [
          {
            role: 'user',
            content: `Analyze this sample student document and provide:
SUMMARY: [brief summary]  
TOPICS: [topic1, topic2, topic3]
QUESTIONS: [question1, question2]

Document: Financial Aid Guide
Financial aid is available to help students pay for college. Students must complete the FAFSA application by March 1st each year. Eligible students can receive grants, loans, and work-study opportunities. The financial aid office is located in Building A, Room 101. Office hours are Monday-Friday 9am-5pm. For questions, call 555-123-4567 or email financialaid@university.edu.`
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
        stream: false
      }
      
      const docResponse = await axios.post(`${apiURL}/chat`, documentAnalysisRequest, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'User-Agent': 'StudentSupportAssistant/1.0'
        },
        timeout: 30000
      })
      
      let docContent = ''
      if (docResponse.data.choices && Array.isArray(docResponse.data.choices)) {
        docContent = docResponse.data.choices[0]?.message?.content || docResponse.data.choices[0]?.text || ''
      } else if (docResponse.data.content) {
        docContent = docResponse.data.content
      } else if (docResponse.data.message) {
        docContent = docResponse.data.message
      }
      
      console.log('✅ Document Analysis Response:')
      console.log('---')
      console.log(docContent)
      console.log('---')
      console.log('')
      
      // Test context-aware student support
      console.log('🎓 Testing context-aware student support response...\n')
      
      const contextRequest = {
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are a Student Support Assistant at Vanderbilt University. Use the provided documentation to answer questions accurately.

Available Documentation:
[Financial Aid Guide]
Financial aid is available to help students pay for college. Students must complete the FAFSA application by March 1st each year. The financial aid office is located in Building A, Room 101. Office hours are Monday-Friday 9am-5pm. For questions, call 555-123-4567.

Guidelines:
- Use the provided documents to answer questions accurately
- Cite your sources when possible
- Be helpful and accurate
- If information isn't in the documents, say so`
          },
          {
            role: 'user',
            content: 'When is the FAFSA deadline and where can I get help with financial aid?'
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        stream: false
      }
      
      const contextResponse = await axios.post(`${apiURL}/chat`, contextRequest, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'User-Agent': 'StudentSupportAssistant/1.0'
        },
        timeout: 30000
      })
      
      let contextContent = ''
      if (contextResponse.data.choices && Array.isArray(contextResponse.data.choices)) {
        contextContent = contextResponse.data.choices[0]?.message?.content || contextResponse.data.choices[0]?.text || ''
      } else if (contextResponse.data.content) {
        contextContent = contextResponse.data.content
      }
      
      console.log('✅ Context-Aware Response:')
      console.log('---')
      console.log(contextContent)
      console.log('---')
      console.log('')
      
      console.log('🎉 Vanderbilt Amplify integration successful!')
      console.log('')
      console.log('🚀 Your Student Support Assistant is now ready with:')
      console.log('- ✅ Vanderbilt Amplify API integration')
      console.log('- ✅ GPT-4o-mini model access')
      console.log('- ✅ Document analysis capabilities')
      console.log('- ✅ Context-aware responses')
      console.log('- ✅ Student support optimization')
      console.log('')
      console.log('🏫 Ready for Vanderbilt students!')
      
    } else {
      console.log('❌ No content found in response')
      console.log('Response structure:', Object.keys(response.data))
    }
    
  } catch (error) {
    console.error('❌ Vanderbilt Amplify test failed:', error.message)
    
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      
      console.log('')
      console.log('📋 Error Details:')
      console.log(`Status: ${status}`)
      console.log(`Data:`, JSON.stringify(data, null, 2))
      console.log('')
      
      if (status === 401) {
        console.log('💡 Authentication Error Solutions:')
        console.log('1. Verify your Vanderbilt Amplify API key is correct')
        console.log('2. Check if the API key has been activated')
        console.log('3. Ensure you have permission to use the GPT-4o-mini model')
        console.log('4. Contact Vanderbilt IT support if the key should be working')
      } else if (status === 404) {
        console.log('💡 Endpoint Not Found Solutions:')
        console.log('1. Verify the API URL is correct: https://prod-api.vanderbilt.ai')
        console.log('2. Check if the /chat endpoint is the correct one')
        console.log('3. Contact Vanderbilt IT for the correct endpoint documentation')
      } else if (status === 429) {
        console.log('💡 Rate Limit Solutions:')
        console.log('1. Wait a few minutes and try again')
        console.log('2. Check if you have exceeded your usage quota')
        console.log('3. Contact Vanderbilt IT about rate limits')
      } else if (status === 400) {
        console.log('💡 Bad Request Solutions:')
        console.log('1. Check if GPT-4o-mini is the correct model name')
        console.log('2. Verify the request format matches Vanderbilt\'s API')
        console.log('3. Try a simpler request with fewer parameters')
      }
    } else {
      console.log('💡 Connection Error Solutions:')
      console.log('1. Check your internet connection')
      console.log('2. Verify the Vanderbilt API URL is accessible')
      console.log('3. Check if there are firewall restrictions')
    }
  }
}

testVanderbiltAmplify()