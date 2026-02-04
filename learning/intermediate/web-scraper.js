#!/usr/bin/env node
/**
 * Web Scraper - Make HTTP requests and parse responses
 * 
 * Run: npm install axios cheerio
 *      node web-scraper.js
 * 
 * Features:
 * - Fetch data from URLs
 * - Parse HTML/JSON responses
 * - Extract specific data points
 * - Handle errors and timeouts
 * - Retry logic
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class WebScraper {
    constructor(timeout = 10000, maxRetries = 3) {
        this.timeout = timeout;
        this.maxRetries = maxRetries;
    }

    /**
     * Fetch URL with retry logic
     */
    async fetch(url, options = {}) {
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                console.log(`Fetching ${url} (attempt ${attempt + 1}/${this.maxRetries})...`);
                
                const response = await this._makeRequest(url, options);
                console.log(`✓ Success: ${response.statusCode} ${response.statusMessage}`);
                
                return response;
            } catch (error) {
                console.log(`✗ ${error.message}`);
                
                if (attempt < this.maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await this._sleep(delay);
                }
            }
        }

        console.log(`✗ Failed after ${this.maxRetries} attempts`);
        return null;
    }

    /**
     * Make HTTP/HTTPS request
     */
    _makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const reqOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {
                    'User-Agent': 'Mozilla/5.0 (Node.js WebScraper/1.0)'
                },
                timeout: this.timeout
            };

            const req = protocol.request(reqOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    res.body = data;
                    resolve(res);
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

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
     * Fetch and parse JSON response
     */
    async fetchJson(url) {
        const response = await this.fetch(url);
        if (!response) {
            return null;
        }

        try {
            const data = JSON.parse(response.body);
            console.log(`✓ Parsed JSON response`);
            return data;
        } catch (error) {
            console.log(`✗ Invalid JSON: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract links from HTML (basic implementation)
     */
    extractLinks(html, baseUrl) {
        const links = [];
        const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            try {
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(href, baseUrl).href;
                links.push(absoluteUrl);
            } catch (error) {
                // Skip invalid URLs
            }
        }

        console.log(`✓ Extracted ${links.length} links`);
        return links;
    }

    /**
     * Extract text content from HTML tags (basic implementation)
     */
    extractText(html, tag) {
        const texts = [];
        const tagRegex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'gi');
        let match;

        while ((match = tagRegex.exec(html)) !== null) {
            texts.push(match[1].trim());
        }

        console.log(`✓ Extracted ${texts.length} ${tag} elements`);
        return texts;
    }

    /**
     * POST data to URL
     */
    async postData(url, data) {
        const body = JSON.stringify(data);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'User-Agent': 'Mozilla/5.0 (Node.js WebScraper/1.0)'
            },
            body: body
        };

        const response = await this.fetch(url, options);
        if (!response) {
            return null;
        }

        try {
            return JSON.parse(response.body);
        } catch (error) {
            return { status: response.statusCode, text: response.body };
        }
    }

    /**
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Demonstration of web scraper functionality
 */
async function demo() {
    console.log('=== Web Scraper Demo ===\n');

    const scraper = new WebScraper(10000, 2);

    // Demo 1: Fetch JSON data
    console.log('--- Demo 1: Fetching JSON Data ---');
    const userData = await scraper.fetchJson('https://jsonplaceholder.typicode.com/users/1');
    if (userData) {
        console.log(`User: ${userData.name}`);
        console.log(`Email: ${userData.email}`);
    }

    // Demo 2: Fetch multiple items
    console.log('\n--- Demo 2: Fetching Multiple Items ---');
    const posts = await scraper.fetchJson('https://jsonplaceholder.typicode.com/posts?userId=1');
    if (posts) {
        console.log(`Found ${posts.length} posts`);
        console.log(`First post title: ${posts[0].title}`);
    }

    // Demo 3: POST request
    console.log('\n--- Demo 3: POST Request ---');
    const newPost = {
        title: 'Test Post',
        body: 'This is a test post from Node.js',
        userId: 1
    };
    const result = await scraper.postData('https://jsonplaceholder.typicode.com/posts', newPost);
    if (result) {
        console.log(`Created post with ID: ${result.id}`);
    }

    // Demo 4: Error handling
    console.log('\n--- Demo 4: Error Handling ---');
    const badResult = await scraper.fetch('https://jsonplaceholder.typicode.com/nonexistent');
    if (!badResult) {
        console.log('Correctly handled 404 error');
    }

    // Demo 5: HTML parsing
    console.log('\n--- Demo 5: HTML Parsing ---');
    const htmlResponse = await scraper.fetch('https://httpbin.org/html');
    if (htmlResponse) {
        const titles = scraper.extractText(htmlResponse.body, 'h1');
        console.log(`Found ${titles.length} h1 elements`);
    }

    console.log('\n✓ Demo completed successfully!');
}

// Run demo if executed directly
if (require.main === module) {
    demo().catch(console.error);
}

module.exports = WebScraper;
