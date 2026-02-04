#!/usr/bin/env node
/**
 * API Client - REST API client with authentication
 * 
 * Run: node api-client.js
 * 
 * Features:
 * - GET/POST/PUT/DELETE requests
 * - JSON request/response handling
 * - Authentication (Bearer token, API key, Basic auth)
 * - Error handling and retries
 * - Rate limiting
 * - Response caching
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

class APIClient {
    constructor(baseUrl, timeout = 30000) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.timeout = timeout;
        this.authToken = null;
        this.apiKey = null;
        this.headers = {
            'User-Agent': 'Node.js API Client/1.0',
            'Content-Type': 'application/json'
        };
        this.cache = {};
        this.rateLimitDelay = 0;
        this.lastRequestTime = 0;
    }

    /**
     * Set Bearer token authentication
     */
    setBearerToken(token) {
        this.authToken = token;
        this.headers['Authorization'] = `Bearer ${token}`;
        console.log('✓ Bearer token authentication configured');
    }

    /**
     * Set API key authentication
     */
    setApiKey(apiKey, headerName = 'X-API-Key') {
        this.apiKey = apiKey;
        this.headers[headerName] = apiKey;
        console.log(`✓ API key authentication configured (${headerName})`);
    }

    /**
     * Set Basic authentication
     */
    setBasicAuth(username, password) {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        this.headers['Authorization'] = `Basic ${credentials}`;
        console.log('✓ Basic authentication configured');
    }

    /**
     * Set rate limiting
     */
    setRateLimit(requestsPerSecond) {
        this.rateLimitDelay = 1000 / requestsPerSecond;
        console.log(`✓ Rate limit set to ${requestsPerSecond} requests/second`);
    }

    /**
     * Apply rate limiting delay
     */
    async _applyRateLimit() {
        if (this.rateLimitDelay > 0) {
            const elapsed = Date.now() - this.lastRequestTime;
            if (elapsed < this.rateLimitDelay) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - elapsed));
            }
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Generate cache key
     */
    _getCacheKey(method, url, params) {
        const keyData = `${method}:${url}:${JSON.stringify(params || {})}`;
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    /**
     * Make HTTP request with retry logic
     */
    async _makeRequest(method, endpoint, maxRetries = 3, useCache = false, options = {}) {
        const url = new URL(endpoint, this.baseUrl + '/').href;

        // Check cache for GET requests
        if (useCache && method === 'GET') {
            const cacheKey = this._getCacheKey(method, url, options.params);
            if (this.cache[cacheKey]) {
                console.log(`✓ Using cached response for ${url}`);
                return this.cache[cacheKey];
            }
        }

        // Apply rate limiting
        await this._applyRateLimit();

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`→ ${method} ${url} (attempt ${attempt + 1}/${maxRetries})`);
                
                const response = await this._request(method, url, options);
                console.log(`✓ ${response.statusCode} ${response.statusMessage}`);

                // Cache successful GET requests
                if (useCache && method === 'GET') {
                    const cacheKey = this._getCacheKey(method, url, options.params);
                    this.cache[cacheKey] = response;
                }

                return response;
            } catch (error) {
                console.log(`✗ ${error.message}`);

                // Don't retry client errors (4xx)
                if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                    return null;
                }

                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        console.log(`✗ Failed after ${maxRetries} attempts`);
        return null;
    }

    /**
     * Perform HTTP request
     */
    _request(method, url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const reqOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: { ...this.headers, ...(options.headers || {}) },
                timeout: this.timeout
            };

            const req = protocol.request(reqOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    res.body = data;
                    if (res.statusCode >= 400) {
                        const error = new Error(`HTTP ${res.statusCode}`);
                        error.statusCode = res.statusCode;
                        error.response = res;
                        reject(error);
                    } else {
                        resolve(res);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Timeout after ${this.timeout}ms`));
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    /**
     * GET request
     */
    async get(endpoint, params = null, useCache = false) {
        let url = endpoint;
        if (params) {
            const query = new URLSearchParams(params).toString();
            url = `${endpoint}?${query}`;
        }

        const response = await this._makeRequest('GET', url, 3, useCache);
        if (!response) return null;

        try {
            return JSON.parse(response.body);
        } catch (error) {
            return { text: response.body };
        }
    }

    /**
     * POST request
     */
    async post(endpoint, data = null) {
        const body = data ? JSON.stringify(data) : null;
        const options = body ? { body } : {};

        const response = await this._makeRequest('POST', endpoint, 3, false, options);
        if (!response) return null;

        try {
            return JSON.parse(response.body);
        } catch (error) {
            return { status: response.statusCode, text: response.body };
        }
    }

    /**
     * PUT request
     */
    async put(endpoint, data = null) {
        const body = data ? JSON.stringify(data) : null;
        const options = body ? { body } : {};

        const response = await this._makeRequest('PUT', endpoint, 3, false, options);
        if (!response) return null;

        try {
            return JSON.parse(response.body);
        } catch (error) {
            return { status: response.statusCode, text: response.body };
        }
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        const response = await this._makeRequest('DELETE', endpoint);
        return response !== null;
    }

    /**
     * Batch GET requests
     */
    async batchGet(endpoints, useCache = false) {
        const promises = endpoints.map(endpoint => this.get(endpoint, null, useCache));
        return Promise.all(promises);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {};
        console.log('✓ Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cachedItems: Object.keys(this.cache).length
        };
    }
}

/**
 * Demo using JSONPlaceholder
 */
async function demoJsonPlaceholder() {
    console.log('='.repeat(70));
    console.log('API CLIENT DEMO - JSONPlaceholder');
    console.log('='.repeat(70));
    console.log();

    const client = new APIClient('https://jsonplaceholder.typicode.com');

    // Demo 1: GET request
    console.log('--- Demo 1: GET Request ---');
    const user = await client.get('/users/1');
    if (user) {
        console.log(`User: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Company: ${user.company.name}`);
    }

    // Demo 2: GET with parameters
    console.log('\n--- Demo 2: GET with Parameters ---');
    const posts = await client.get('/posts', { userId: 1 });
    if (posts) {
        console.log(`Found ${posts.length} posts`);
        console.log(`First post: ${posts[0].title}`);
    }

    // Demo 3: POST request
    console.log('\n--- Demo 3: POST Request ---');
    const newPost = {
        title: 'Test Post',
        body: 'This is a test post from Node.js API client',
        userId: 1
    };
    const result = await client.post('/posts', newPost);
    if (result) {
        console.log(`Created post with ID: ${result.id}`);
        console.log(`Title: ${result.title}`);
    }

    // Demo 4: PUT request
    console.log('\n--- Demo 4: PUT Request ---');
    const updatedPost = {
        id: 1,
        title: 'Updated Title',
        body: 'Updated body content',
        userId: 1
    };
    const updateResult = await client.put('/posts/1', updatedPost);
    if (updateResult) {
        console.log(`Updated post ${updateResult.id}`);
        console.log(`New title: ${updateResult.title}`);
    }

    // Demo 5: DELETE request
    console.log('\n--- Demo 5: DELETE Request ---');
    const deleteSuccess = await client.delete('/posts/1');
    if (deleteSuccess) {
        console.log('✓ Successfully deleted post');
    }

    // Demo 6: Batch requests
    console.log('\n--- Demo 6: Batch Requests ---');
    const endpoints = ['/users/1', '/users/2', '/users/3'];
    const users = await client.batchGet(endpoints);
    console.log(`Retrieved ${users.filter(u => u).length} users`);
    for (const u of users) {
        if (u) console.log(`  - ${u.name}`);
    }

    // Demo 7: Caching
    console.log('\n--- Demo 7: Response Caching ---');
    console.log('First request (no cache):');
    await client.get('/users/1', null, true);
    
    console.log('\nSecond request (from cache):');
    await client.get('/users/1', null, true);

    const stats = client.getCacheStats();
    console.log(`\nCache statistics: ${JSON.stringify(stats)}`);

    // Demo 8: Rate limiting
    console.log('\n--- Demo 8: Rate Limiting ---');
    client.setRateLimit(2);
    console.log('Making 3 requests with rate limiting...');
    const start = Date.now();
    for (let i = 0; i < 3; i++) {
        await client.get(`/users/${i + 1}`);
    }
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Total time: ${elapsed.toFixed(2)}s (should be ~1s due to rate limiting)`);

    console.log('\n' + '='.repeat(70));
    console.log('✓ Demo completed successfully!');
    console.log('='.repeat(70));
}

/**
 * Demo using HTTPBin
 */
async function demoHttpBin() {
    console.log('\n' + '='.repeat(70));
    console.log('API CLIENT DEMO - HTTPBin (Authentication & Headers)');
    console.log('='.repeat(70));
    console.log();

    const client = new APIClient('https://httpbin.org');

    console.log('--- Bearer Token Authentication ---');
    client.setBearerToken('test-token-12345');
    const response = await client.get('/bearer');
    if (response) {
        console.log(`Authenticated: ${response.authenticated}`);
        console.log(`Token: ${response.token}`);
    }

    console.log('\n✓ HTTPBin demo completed!');
}

/**
 * Main function
 */
async function main() {
    await demoJsonPlaceholder();
    await demoHttpBin();
}

// Run demo if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = APIClient;
