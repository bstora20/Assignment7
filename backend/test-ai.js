// Test AI functionality with OpenAI
require('dotenv').config({ path: '../.env' })

async function testAI() {
  console.log('🤖 Testing AI Service...\n')
  
  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('placeholder') || process.env.OPENAI_API_KEY.includes('your-')) {
    console.log('❌ OpenAI API Key not configured properly')
    console.log('Current key:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Not set')
    console.log('\nPlease update your .env file with a valid OpenAI API key:')
    console.log('OPENAI_API_KEY=sk-your-actual-openai-api-key-here')
    return
  }
  
  console.log('✅ API Key configured:', process.env.OPENAI_API_KEY.substring(0, 10) + '...')
  
  try {
    // Test OpenAI directly
    const { OpenAI } = require('openai')
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    console.log('\n📡 Testing OpenAI connection...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful student support assistant. Respond briefly and helpfully.'
        },
        {
          role: 'user', 
          content: 'What are your office hours?'
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || 'No response generated'
    
    console.log('✅ OpenAI API Response:')
    console.log('---')
    console.log(response)
    console.log('---')
    
    console.log('\n📊 Token Usage:')
    console.log('- Prompt tokens:', completion.usage?.prompt_tokens || 0)
    console.log('- Completion tokens:', completion.usage?.completion_tokens || 0) 
    console.log('- Total tokens:', completion.usage?.total_tokens || 0)
    
    // Test document summarization
    console.log('\n📄 Testing document summarization...')
    
    const sampleDocuments = [
      {
        originalName: 'Financial Aid Guide.pdf',
        content: 'Financial aid is available to help students pay for college. Students must complete the FAFSA application by March 1st each year. Eligible students can receive grants, loans, and work-study opportunities. The financial aid office is located in Building A, Room 101. Office hours are Monday-Friday 9am-5pm. For questions, call 555-123-4567 or email financialaid@university.edu.',
        metadata: { wordCount: 50 }
      },
      {
        originalName: 'Registration Guide.pdf', 
        content: 'Course registration begins on April 15th for continuing students and May 1st for new students. Students can register online through the student portal or visit the Registrar office in Building B, Room 205. Prerequisites must be completed before enrolling in advanced courses. Add/drop deadline is two weeks after semester starts.',
        metadata: { wordCount: 45 }
      }
    ]
    
    const summaryCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Analyze the following documents and provide:
1. A comprehensive summary of the content
2. Key topics covered (as a list)
3. Suggested questions students might ask about this content

Documents:
Document: Financial Aid Guide.pdf
${sampleDocuments[0].content}

---

Document: Registration Guide.pdf
${sampleDocuments[1].content}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", ...],
  "suggestedQuestions": ["question1", "question2", ...]
}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    })
    
    const summaryResponse = summaryCompletion.choices[0]?.message?.content
    console.log('✅ Document Summary Response:')
    console.log('---')
    console.log(summaryResponse)
    console.log('---')
    
    // Test response generation with context
    console.log('\n💬 Testing context-aware response...')
    
    const contextCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a Student Support Assistant. Use the provided documentation to answer questions accurately.

Available Documentation:
[Financial Aid Guide.pdf]
${sampleDocuments[0].content}

[Registration Guide.pdf] 
${sampleDocuments[1].content}

Guidelines:
- Use the provided documents to answer questions
- Cite your sources when possible
- Be helpful and accurate
- If information isn't in the documents, say so`
        },
        {
          role: 'user',
          content: 'When is the FAFSA deadline and where can I get help with it?'
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    })
    
    const contextResponse = contextCompletion.choices[0]?.message?.content
    console.log('✅ Context-Aware Response:')
    console.log('---')
    console.log(contextResponse)
    console.log('---')
    
    console.log('\n🎉 All AI tests passed successfully!')
    console.log('\nYour OpenAI integration is working correctly and ready for the Student Support Assistant!')
    
  } catch (error) {
    console.error('❌ AI test failed:', error.message)
    
    if (error.message.includes('401')) {
      console.log('\n💡 This looks like an authentication error.')
      console.log('Please check that your OpenAI API key is correct and has not expired.')
    } else if (error.message.includes('429')) {
      console.log('\n💡 Rate limit exceeded. Please try again in a moment.')
    } else if (error.message.includes('quota')) {
      console.log('\n💡 API quota exceeded. Please check your OpenAI account billing.')
    } else {
      console.log('\n💡 Unexpected error. Please check your internet connection and API key.')
    }
  }
}

testAI()