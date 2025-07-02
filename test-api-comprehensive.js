/**
 * Comprehensive API Test Script
 * Tests all API endpoints with proper cleanup
 * Run with: node test-api-comprehensive.js
 */

import http from 'http';
import { URL } from 'url';

class APITester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.cookies = '';
    this.testData = {
      createdDocuments: [],
      createdDirectories: [],
      testUser: null
    };
  }

  // HTTP request helper
  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cookies,
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          // Store cookies from response
          if (res.headers['set-cookie']) {
            this.cookies = res.headers['set-cookie'].join('; ');
          }
          
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonBody
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  // Test result logging
  logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${message ? ': ' + message : ''}`);
    if (!passed) {
      this.hasFailures = true;
    }
  }

  // Authentication Tests
  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    // Test user registration
    const registerData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123'
    };

    const registerResponse = await this.makeRequest('POST', '/api/auth/register', registerData);
    this.logTest('User Registration', registerResponse.statusCode === 201, 
      `Status: ${registerResponse.statusCode}`);
    
    if (registerResponse.statusCode === 201) {
      this.testData.testUser = registerData;
    }

    // Test user login
    const loginData = {
      username: registerData.username,
      password: registerData.password
    };

    const loginResponse = await this.makeRequest('POST', '/api/auth/login', loginData);
    this.logTest('User Login', loginResponse.statusCode === 200, 
      `Status: ${loginResponse.statusCode}`);

    // Test protected route access
    const profileResponse = await this.makeRequest('GET', '/api/auth/me');
    this.logTest('Protected Route Access', profileResponse.statusCode === 200, 
      `Status: ${profileResponse.statusCode}`);
  }

  // Document Management Tests
  async testDocumentManagement() {
    console.log('\n📄 Testing Document Management...');

    // Test create document
    const documentData = {
      title: 'Test Document',
      content: '# Test Document\n\nThis is a test document for API testing.',
      path: '/test-document.md'
    };

    const createDocResponse = await this.makeRequest('POST', '/api/documents', documentData);
    this.logTest('Create Document', createDocResponse.statusCode === 201, 
      `Status: ${createDocResponse.statusCode}`);
    
    if (createDocResponse.statusCode === 201 && createDocResponse.body.document) {
      this.testData.createdDocuments.push(createDocResponse.body.document.id);
    }

    // Test get all documents
    const getDocsResponse = await this.makeRequest('GET', '/api/documents');
    this.logTest('Get All Documents', getDocsResponse.statusCode === 200, 
      `Status: ${getDocsResponse.statusCode}`);

    // Test get specific document
    if (this.testData.createdDocuments.length > 0) {
      const docId = this.testData.createdDocuments[0];
      const getDocResponse = await this.makeRequest('GET', `/api/documents/${docId}`);
      this.logTest('Get Specific Document', getDocResponse.statusCode === 200, 
        `Status: ${getDocResponse.statusCode}`);
    }

    // Test update document
    if (this.testData.createdDocuments.length > 0) {
      const docId = this.testData.createdDocuments[0];
      const updateData = {
        title: 'Updated Test Document',
        content: '# Updated Test Document\n\nThis document has been updated.'
      };
      
      const updateResponse = await this.makeRequest('PUT', `/api/documents/${docId}`, updateData);
      this.logTest('Update Document', updateResponse.statusCode === 200, 
        `Status: ${updateResponse.statusCode}`);
    }
  }

  // Directory Management Tests
  async testDirectoryManagement() {
    console.log('\n📁 Testing Directory Management...');

    // Test create directory
    const directoryData = {
      title: 'Test Directory',
      path: '/test-directory'
    };

    const createDirResponse = await this.makeRequest('POST', '/api/documents/directories', directoryData);
    this.logTest('Create Directory', createDirResponse.statusCode === 201, 
      `Status: ${createDirResponse.statusCode}`);
    
    if (createDirResponse.statusCode === 201 && createDirResponse.body.document) {
      this.testData.createdDirectories.push(createDirResponse.body.document.id);
    }

    // Test create document in directory
    if (this.testData.createdDirectories.length > 0) {
      const parentId = this.testData.createdDirectories[0];
      const docInDirData = {
        title: 'Document in Directory',
        content: '# Document in Directory\n\nThis document is inside a directory.',
        path: '/test-directory/doc-in-dir.md',
        parent_id: parentId
      };

      const createDocInDirResponse = await this.makeRequest('POST', '/api/documents', docInDirData);
      this.logTest('Create Document in Directory', createDocInDirResponse.statusCode === 201, 
        `Status: ${createDocInDirResponse.statusCode}`);
      
      if (createDocInDirResponse.statusCode === 201 && createDocInDirResponse.body.document) {
        this.testData.createdDocuments.push(createDocInDirResponse.body.document.id);
      }
    }

    // Test get file tree
    const getTreeResponse = await this.makeRequest('GET', '/api/documents/tree');
    this.logTest('Get File Tree', getTreeResponse.statusCode === 200, 
      `Status: ${getTreeResponse.statusCode}`);
  }

  // Document Operations Tests
  async testDocumentOperations() {
    console.log('\n🔄 Testing Document Operations...');

    if (this.testData.createdDocuments.length >= 2) {
      // Test move document
      const sourceId = this.testData.createdDocuments[1];
      const targetId = this.testData.createdDirectories[0] || null;
      
      console.log(`Debug: Moving document ${sourceId} to parent ${targetId}`);
      
      const moveData = {
        new_parent_id: targetId,
        new_path: targetId ? '/test-directory/moved-document.md' : '/moved-document.md'
      };

      const moveResponse = await this.makeRequest('PATCH', `/api/documents/${sourceId}/move`, moveData);
      this.logTest('Move Document', moveResponse.statusCode === 200, 
        `Status: ${moveResponse.statusCode}${moveResponse.statusCode !== 200 ? ', Error: ' + JSON.stringify(moveResponse.body) : ''}`);
    }

    // Note: Search endpoint not implemented yet
    console.log('ℹ️  Search Documents endpoint not implemented yet - skipping test');
  }

  // Cleanup Tests - Delete all created test data
  async testCleanup() {
    console.log('\n🧹 Testing Cleanup (Delete Operations)...');

    // Delete all created documents
    for (const docId of this.testData.createdDocuments) {
      const deleteResponse = await this.makeRequest('DELETE', `/api/documents/${docId}`);
      this.logTest(`Delete Document ${docId}`, deleteResponse.statusCode === 200, 
        `Status: ${deleteResponse.statusCode}`);
      
      // Verify document is deleted
      const verifyResponse = await this.makeRequest('GET', `/api/documents/${docId}`);
      this.logTest(`Verify Document ${docId} Deleted`, verifyResponse.statusCode === 404, 
        `Status: ${verifyResponse.statusCode}`);
    }

    // Delete all created directories
    for (const dirId of this.testData.createdDirectories) {
      const deleteResponse = await this.makeRequest('DELETE', `/api/documents/${dirId}`);
      this.logTest(`Delete Directory ${dirId}`, deleteResponse.statusCode === 200, 
        `Status: ${deleteResponse.statusCode}`);
      
      // Verify directory is deleted
      const verifyResponse = await this.makeRequest('GET', `/api/documents/${dirId}`);
      this.logTest(`Verify Directory ${dirId} Deleted`, verifyResponse.statusCode === 404, 
        `Status: ${verifyResponse.statusCode}`);
    }

    // Verify no test documents remain
    const finalDocsResponse = await this.makeRequest('GET', '/api/documents');
    if (finalDocsResponse.statusCode === 200) {
      const remainingTestDocs = finalDocsResponse.body.documents?.filter(doc => 
        doc.title.includes('Test') || doc.path.includes('test')
      ) || [];
      
      this.logTest('All Test Data Cleaned', remainingTestDocs.length === 0, 
        `Remaining test documents: ${remainingTestDocs.length}`);
    }
  }

  // Error Handling Tests
  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');

    // Test invalid document creation
    const invalidDocData = {
      title: '', // Invalid: empty title
      content: 'Test content',
      path: '/invalid.md'
    };

    const invalidDocResponse = await this.makeRequest('POST', '/api/documents', invalidDocData);
    this.logTest('Invalid Document Creation', invalidDocResponse.statusCode === 400, 
      `Status: ${invalidDocResponse.statusCode}`);

    // Test access non-existent document
    const nonExistentResponse = await this.makeRequest('GET', '/api/documents/non-existent-id');
    this.logTest('Access Non-existent Document', nonExistentResponse.statusCode === 404, 
      `Status: ${nonExistentResponse.statusCode}`);

    // Test unauthorized access (logout first)
    await this.makeRequest('POST', '/api/auth/logout');
    // Clear cookies to simulate logged out state
    this.cookies = '';
    const unauthorizedResponse = await this.makeRequest('GET', '/api/documents');
    this.logTest('Unauthorized Access', unauthorizedResponse.statusCode === 401, 
      `Status: ${unauthorizedResponse.statusCode}`);
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive API Tests...');
    console.log('=' .repeat(50));
    
    this.hasFailures = false;
    
    try {
      await this.testAuthentication();
      await this.testDocumentManagement();
      await this.testDirectoryManagement();
      await this.testDocumentOperations();
      await this.testCleanup();
      await this.testErrorHandling();
      
      console.log('\n' + '=' .repeat(50));
      if (this.hasFailures) {
        console.log('❌ Some tests failed. Please check the output above.');
        process.exit(1);
      } else {
        console.log('✅ All tests passed successfully!');
        console.log('🎉 API is working correctly and test data has been cleaned up.');
      }
    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
const tester = new APITester();
tester.runAllTests().catch(console.error);

export default APITester;