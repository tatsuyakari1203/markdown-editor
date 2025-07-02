// Simple API testing script
const baseUrl = 'http://localhost:3001/api';

async function testAPI(endpoint, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`\n=== ${method} ${endpoint} ===`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...');
  
  // Test 1: Health check (if exists)
  await testAPI('/');
  
  // Test 2: Register a new user
  console.log('\n📝 Testing User Registration...');
  const registerResult = await testAPI('/auth/register', 'POST', {
    username: 'testuser',
    password: 'testpassword123'
  });
  
  // Test 3: Login with the user
  console.log('\n🔐 Testing User Login...');
  const loginResult = await testAPI('/auth/login', 'POST', {
    username: 'testuser',
    password: 'testpassword123'
  });
  
  let sessionCookie = '';
  if (loginResult && loginResult.response.headers.get('set-cookie')) {
    sessionCookie = loginResult.response.headers.get('set-cookie');
    console.log('Session cookie:', sessionCookie);
  }
  
  // Test 4: Get current user info
  console.log('\n👤 Testing Get Current User...');
  await testAPI('/auth/me', 'GET', null, {
    'Cookie': sessionCookie
  });
  
  // Test 5: Get documents (should be empty initially)
  console.log('\n📄 Testing Get Documents...');
  await testAPI('/documents', 'GET', null, {
    'Cookie': sessionCookie
  });
  
  // Test 6: Create a new document
  console.log('\n📝 Testing Create Document...');
  const createDocResult = await testAPI('/documents', 'POST', {
    title: 'Test Document',
    content: '# Hello World\n\nThis is a test document.',
    path: '/test-document.md',
    is_directory: false
  }, {
    'Cookie': sessionCookie
  });
  
  let documentId = '';
  if (createDocResult && createDocResult.data && createDocResult.data.id) {
    documentId = createDocResult.data.id;
  }
  
  // Test 7: Get the created document
  if (documentId) {
    console.log('\n📖 Testing Get Document by ID...');
    await testAPI(`/documents/${documentId}`, 'GET', null, {
      'Cookie': sessionCookie
    });
  }
  
  // Test 8: Update the document
  if (documentId) {
    console.log('\n✏️ Testing Update Document...');
    await testAPI(`/documents/${documentId}`, 'PUT', {
      title: 'Updated Test Document',
      content: '# Hello World (Updated)\n\nThis document has been updated.',
    }, {
      'Cookie': sessionCookie
    });
  }
  
  // Test 9: Get file tree
  console.log('\n🌳 Testing Get File Tree...');
  await testAPI('/documents/tree', 'GET', null, {
    'Cookie': sessionCookie
  });
  
  // Test 10: Create a directory
  console.log('\n📁 Testing Create Directory...');
  await testAPI('/documents/directory', 'POST', {
    name: 'Test Folder',
    parent_id: null
  }, {
    'Cookie': sessionCookie
  });
  
  // Test 11: Logout
  console.log('\n🚪 Testing Logout...');
  await testAPI('/auth/logout', 'POST', null, {
    'Cookie': sessionCookie
  });
  
  console.log('\n✅ API Tests Completed!');
}

// Run the tests
runTests().catch(console.error);