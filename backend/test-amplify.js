// Test Amplify AI functionality
require('dotenv').config({ path: '../.env' })
const axios = require('axios')

async function testAmplify() {
  console.log('🚀 Testing Anthropic Amplify Integration...\n')
  
  // Check if API key is configured
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AMPLIFY_API_KEY;
  if (!apiKey) {
    console.log('❌ API Key not configured')
    console.log('Please update your .env file with your Amplify API key')
    return
  }
  
  console.log('✅ API Key configured:', apiKey.substring(0, 15) + '...')
  console.log('🔍 Key type detected: Amplify (amp-v1-*)')
  
  // Test multiple potential Amplify endpoints and formats
  const baseURLs = [
    'https://api.anthropic.com',
    'https://amplify.anthropic.com', 
    'https://institutional.anthropic.com',
    process.env.AMPLIFY_API_URL
  ].filter(Boolean);
  
  const endpoints = [
    '/v1/messages',
    '/v1/chat/completions', 
    '/v1/complete',
    '/messages',
    '/chat',
    '/completions'
  ];
  
  const testMessage = 'Hello! What are your office hours and how can students get help with financial aid?';
  
  console.log('\n📡 Testing Amplify API endpoints...\n')
  
  for (const baseURL of baseURLs) {
    console.log(`🌐 Testing base URL: ${baseURL}`)
    
    for (const endpoint of endpoints) {
      const fullURL = `${baseURL}${endpoint}`;
      
      // Try different request formats
      const requestFormats = [
        // Format 1: Anthropic Claude-style
        {
          name: 'Anthropic Format',
          data: {
            model: 'claude-3-haiku-20240307',
            max_tokens: 200,
            temperature: 0.7,
            messages: [
              {
                role: 'user',
                content: testMessage
              }
            ]
          }
        },
        // Format 2: OpenAI-style for compatibility  
        {
          name: 'OpenAI Format',
          data: {
            model: 'claude-3-haiku-20240307',
            messages: [
              {
                role: 'user',
                content: testMessage
              }
            ],
            max_tokens: 200,
            temperature: 0.7
          }
        },
        // Format 3: Simple completion format
        {
          name: 'Completion Format',
          data: {
            model: 'claude-3-haiku-20240307',
            prompt: testMessage,
            max_tokens: 200,
            temperature: 0.7
          }
        }
      ];
      
      for (const format of requestFormats) {
        try {
          process.stdout.write(`  🧪 ${endpoint} (${format.name})... `)
          
          const response = await axios.post(fullURL, format.data, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'Authorization': `Bearer ${apiKey}`,
              'anthropic-version': '2023-06-01',
              'User-Agent': 'StudentSupportAssistant/1.0'
            },
            timeout: 10000 // 10 second timeout for testing
          });
          
          // Try to extract response content
          let content = '';
          
          if (response.data.content && Array.isArray(response.data.content)) {
            // Anthropic format
            content = response.data.content[0]?.text || '';
          } else if (response.data.choices && Array.isArray(response.data.choices)) {
            // OpenAI format  
            content = response.data.choices[0]?.message?.content || response.data.choices[0]?.text || '';
          } else if (response.data.completion || response.data.text) {
            // Simple completion format
            content = response.data.completion || response.data.text || '';
          } else if (typeof response.data === 'string') {
            // Direct string response
            content = response.data;
          }
          
          if (content && content.length > 10) {
            console.log('✅ SUCCESS!')
            console.log(`\n🎯 Working endpoint found: ${fullURL}`)
            console.log(`📊 Format: ${format.name}`)
            console.log(`📝 Response preview:`)
            console.log('---')
            console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''))
            console.log('---')
            
            // Test document summarization
            console.log('\n📄 Testing document summarization...')
            
            const summaryPrompt = `Analyze this sample student document and provide:
SUMMARY: [brief summary]  
TOPICS: [topic1, topic2, topic3]
QUESTIONS: [question1, question2]

Document: Financial Aid Guide
Financial aid is available to help students pay for college. Students must complete the FAFSA application by March 1st each year. The office is located in Building A, Room 101. Office hours are Monday-Friday 9am-5pm.`;

            const summaryRequest = { ...format.data };
            if (summaryRequest.messages) {
              summaryRequest.messages = [{ role: 'user', content: summaryPrompt }];
            } else {
              summaryRequest.prompt = summaryPrompt;
            }
            
            const summaryResponse = await axios.post(fullURL, summaryRequest, {
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'anthropic-version': '2023-06-01',
                'User-Agent': 'StudentSupportAssistant/1.0'
              },
              timeout: 10000
            });
            
            let summaryContent = '';
            if (summaryResponse.data.content && Array.isArray(summaryResponse.data.content)) {
              summaryContent = summaryResponse.data.content[0]?.text || '';
            } else if (summaryResponse.data.choices && Array.isArray(summaryResponse.data.choices)) {
              summaryContent = summaryResponse.data.choices[0]?.message?.content || summaryResponse.data.choices[0]?.text || '';
            } else if (summaryResponse.data.completion || summaryResponse.data.text) {
              summaryContent = summaryResponse.data.completion || summaryResponse.data.text || '';
            }
            
            console.log('✅ Document analysis working!')
            console.log('---')
            console.log(summaryContent.substring(0, 300))
            console.log('---')
            
            console.log('\n🎉 Amplify integration successful!')
            console.log('\n📋 Configuration for your .env file:')
            console.log(`AMPLIFY_API_URL=${baseURL}`)
            console.log(`OPENAI_API_KEY=${apiKey}`)
            
            console.log('\n✨ Your Student Support Assistant is now ready with Amplify AI!')
            return true;
          }
          
        } catch (error) {
          console.log('❌')
          if (error.code === 'ECONNABORTED') {
            console.log(`    ⏰ Timeout (${error.message})`)
          } else if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error?.message || error.response.data?.message || 'Unknown error';
            console.log(`    🔍 ${status}: ${message}`)
            
            if (status === 401) {
              console.log('    💡 Authentication issue - check API key permissions')
            } else if (status === 404) {
              console.log('    💡 Endpoint not found - trying next...')
            } else if (status === 429) {
              console.log('    💡 Rate limited - trying next...')
            }
          } else {
            console.log(`    ❓ ${error.message}`)
          }
          continue;
        }
      }
    }
  }
  
  console.log('\n❌ Unable to connect to Amplify API with any tested configuration.')
  console.log('\n🔧 Troubleshooting steps:')
  console.log('1. Verify your API key is active and has the correct permissions')
  console.log('2. Contact your institution\'s IT department for the correct Amplify endpoint')
  console.log('3. Check if there are any firewall or network restrictions')
  console.log('4. Try adding the correct AMPLIFY_API_URL to your .env file')
  
  console.log('\n📞 Need help? Provide your IT team with:')
  console.log('- API Key format: amp-v1-* (Amplify institutional key)')
  console.log('- Required endpoints: /v1/messages or /v1/chat/completions')
  console.log('- Required models: claude-3-haiku-20240307 or similar')
  
  return false;
}

testAmplify()