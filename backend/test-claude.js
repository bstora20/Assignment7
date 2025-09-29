// Test Claude AI functionality
require('dotenv').config({ path: '../.env' })

async function testClaude() {
  console.log('🤖 Testing Claude AI Service...\n')
  
  // Check if API key is configured
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('❌ API Key not configured')
    console.log('Please update your .env file with your Anthropic Claude API key')
    return
  }
  
  console.log('✅ API Key configured:', apiKey.substring(0, 10) + '...')
  
  try {
    // Test Anthropic Claude directly
    const { Anthropic } = require('@anthropic-ai/sdk')
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })
    
    console.log('\n📡 Testing Anthropic Claude connection...')
    
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.7,
      system: 'You are a helpful student support assistant. Respond briefly and helpfully.',
      messages: [
        {
          role: 'user', 
          content: 'What are your office hours and how can students get help?'
        }
      ],
    })

    const response = completion.content[0]?.type === 'text' 
      ? completion.content[0].text 
      : 'No response generated'
    
    console.log('✅ Claude API Response:')
    console.log('---')
    console.log(response)
    console.log('---')
    
    console.log('\n📊 Token Usage:')
    console.log('- Input tokens:', completion.usage.input_tokens || 0)
    console.log('- Output tokens:', completion.usage.output_tokens || 0) 
    console.log('- Total tokens:', (completion.usage.input_tokens || 0) + (completion.usage.output_tokens || 0))
    
    // Test document summarization
    console.log('\n📄 Testing document summarization with Claude...')
    
    const sampleDocuments = `Document: Financial Aid Guide.pdf
Financial aid is available to help students pay for college. Students must complete the FAFSA application by March 1st each year. Eligible students can receive grants, loans, and work-study opportunities. The financial aid office is located in Building A, Room 101. Office hours are Monday-Friday 9am-5pm. For questions, call 555-123-4567 or email financialaid@university.edu.

---

Document: Registration Guide.pdf
Course registration begins on April 15th for continuing students and May 1st for new students. Students can register online through the student portal or visit the Registrar office in Building B, Room 205. Prerequisites must be completed before enrolling in advanced courses. Add/drop deadline is two weeks after semester starts.`
    
    const summaryCompletion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Analyze the following documents and provide a comprehensive analysis.

Documents:
${sampleDocuments}

Please provide:
1. A comprehensive summary of the content (2-3 sentences)
2. Key topics covered (as a comma-separated list)
3. Suggested questions students might ask about this content (3-5 questions)

Format your response as:
SUMMARY: [your summary here]
TOPICS: [topic1, topic2, topic3, ...]
QUESTIONS: [question1, question2, question3, ...]`
        }
      ],
    })
    
    const summaryResponse = summaryCompletion.content[0]?.type === 'text' 
      ? summaryCompletion.content[0].text 
      : 'No response'
    console.log('✅ Document Summary Response:')
    console.log('---')
    console.log(summaryResponse)
    console.log('---')
    
    // Test context-aware response
    console.log('\n💬 Testing context-aware student support response...')
    
    const contextCompletion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.7,
      system: `You are a Student Support Assistant. Use the provided documentation to answer questions accurately.

Available Documentation:
[Financial Aid Guide.pdf]
Financial aid is available to help students pay for college. Students must complete the FAFSA application by March 1st each year. Eligible students can receive grants, loans, and work-study opportunities. The financial aid office is located in Building A, Room 101. Office hours are Monday-Friday 9am-5pm. For questions, call 555-123-4567 or email financialaid@university.edu.

[Registration Guide.pdf] 
Course registration begins on April 15th for continuing students and May 1st for new students. Students can register online through the student portal or visit the Registrar office in Building B, Room 205. Prerequisites must be completed before enrolling in advanced courses. Add/drop deadline is two weeks after semester starts.

Guidelines:
- Use the provided documents to answer questions accurately
- Cite your sources when possible
- Be helpful and accurate
- If information isn't in the documents, say so`,
      messages: [
        {
          role: 'user',
          content: 'When is the FAFSA deadline and where can I get help with financial aid?'
        }
      ],
    })
    
    const contextResponse = contextCompletion.content[0]?.type === 'text' 
      ? contextCompletion.content[0].text 
      : 'No response'
    console.log('✅ Context-Aware Response:')
    console.log('---')
    console.log(contextResponse)
    console.log('---')
    
    console.log('\n🎉 All Claude AI tests passed successfully!')
    console.log('\nYour Claude integration is working correctly and ready for the Student Support Assistant!')
    console.log('\n🔥 Claude Benefits for Student Support:')
    console.log('- Excellent at understanding and citing documents')
    console.log('- More helpful and nuanced responses')
    console.log('- Better at following instructions and formatting')
    console.log('- Strong safety and accuracy features')
    
  } catch (error) {
    console.error('❌ Claude AI test failed:', error.message)
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('\n💡 This looks like an authentication error.')
      console.log('Please check that your Claude API key is correct and active.')
      console.log('You can find your API keys at: https://console.anthropic.com/account/keys')
    } else if (error.message.includes('429')) {
      console.log('\n💡 Rate limit exceeded. Please try again in a moment.')
    } else if (error.message.includes('quota') || error.message.includes('billing')) {
      console.log('\n💡 API quota or billing issue. Please check your Anthropic account.')
    } else {
      console.log('\n💡 Unexpected error. Please check your internet connection and API key.')
      console.log('Full error:', error)
    }
  }
}

testClaude()