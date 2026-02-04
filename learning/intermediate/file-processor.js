#!/usr/bin/env node
/**
 * File Processor - Process CSV/text files and generate reports
 * 
 * Run: node file-processor.js
 * 
 * Features:
 * - Read and parse CSV files
 * - Aggregate and analyze data
 * - Calculate statistics (sum, average, max, min, median, etc.)
 * - Generate formatted reports
 * - Handle large files efficiently
 */

const fs = require('fs');

class CSVProcessor {
    constructor(filepath) {
        this.filepath = filepath;
        this.data = [];
        this.headers = [];
    }

    /**
     * Load CSV file
     */
    load(delimiter = ',', encoding = 'utf8') {
        try {
            const content = fs.readFileSync(this.filepath, encoding);
            const lines = content.trim().split('\n');
            
            if (lines.length === 0) {
                console.log('✗ Empty file');
                return false;
            }

            this.headers = lines[0].split(delimiter).map(h => h.trim());
            this.data = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(delimiter).map(v => v.trim());
                const row = {};
                this.headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });
                this.data.push(row);
            }

            console.log(`✓ Loaded ${this.data.length} rows from ${this.filepath}`);
            console.log(`  Columns: ${this.headers.join(', ')}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`✗ File not found: ${this.filepath}`);
            } else {
                console.log(`✗ Error loading CSV: ${error.message}`);
            }
            return false;
        }
    }

    /**
     * Save data to CSV file
     */
    save(filepath, data = null) {
        const dataToSave = data || this.data;

        if (!dataToSave || dataToSave.length === 0) {
            console.log('✗ No data to save');
            return false;
        }

        try {
            const headers = Object.keys(dataToSave[0]);
            const lines = [headers.join(',')];
            
            for (const row of dataToSave) {
                const values = headers.map(h => row[h] || '');
                lines.push(values.join(','));
            }

            fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
            console.log(`✓ Saved ${dataToSave.length} rows to ${filepath}`);
            return true;
        } catch (error) {
            console.log(`✗ Error saving CSV: ${error.message}`);
            return false;
        }
    }

    /**
     * Filter rows based on condition
     */
    filter(condition) {
        return this.data.filter(condition);
    }

    /**
     * Group rows by column value
     */
    groupBy(column) {
        const groups = {};
        for (const row of this.data) {
            const key = row[column] || 'N/A';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(row);
        }
        return groups;
    }

    /**
     * Extract column values, optionally converting type
     */
    getColumn(column, convertType = null) {
        const values = [];
        for (const row of this.data) {
            const value = row[column];
            if (value !== undefined && value !== null && value !== '') {
                try {
                    values.push(convertType ? convertType(value) : value);
                } catch (error) {
                    // Skip invalid values
                }
            }
        }
        return values;
    }

    /**
     * Aggregate column using function
     */
    aggregate(column, func = 'sum') {
        try {
            const values = this.getColumn(column, parseFloat);
            if (values.length === 0) {
                return null;
            }

            if (func === 'sum') {
                return values.reduce((a, b) => a + b, 0);
            } else if (func === 'avg' || func === 'mean') {
                return values.reduce((a, b) => a + b, 0) / values.length;
            } else if (func === 'max') {
                return Math.max(...values);
            } else if (func === 'min') {
                return Math.min(...values);
            } else if (func === 'median') {
                const sorted = values.sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            } else if (func === 'stdev') {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                return Math.sqrt(variance);
            } else {
                console.log(`✗ Unknown function: ${func}`);
                return null;
            }
        } catch (error) {
            console.log(`✗ Error aggregating: ${error.message}`);
            return null;
        }
    }

    /**
     * Count unique values in column
     */
    countUnique(column) {
        const values = this.getColumn(column);
        return new Set(values).size;
    }

    /**
     * Count occurrences of each value
     */
    valueCounts(column) {
        const counts = {};
        for (const row of this.data) {
            const value = row[column] || 'N/A';
            counts[value] = (counts[value] || 0) + 1;
        }

        // Sort by count descending
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});
    }
}

class ReportGenerator {
    constructor(processor) {
        this.processor = processor;
    }

    /**
     * Generate summary statistics report
     */
    summaryReport() {
        const lines = [];
        lines.push('='.repeat(70));
        lines.push('DATA SUMMARY REPORT');
        lines.push('='.repeat(70));
        lines.push(`File: ${this.processor.filepath}`);
        lines.push(`Total Rows: ${this.processor.data.length}`);
        lines.push(`Columns: ${this.processor.headers.length}`);
        lines.push('');

        lines.push('Column Information:');
        lines.push('-'.repeat(70));
        for (const col of this.processor.headers) {
            const unique = this.processor.countUnique(col);
            lines.push(`  ${col}: ${unique} unique values`);
        }

        return lines.join('\n');
    }

    /**
     * Generate statistics for numeric columns
     */
    numericStatistics(numericColumns) {
        const lines = [];
        lines.push('');
        lines.push('='.repeat(70));
        lines.push('NUMERIC STATISTICS');
        lines.push('='.repeat(70));

        const statsFuncs = ['sum', 'avg', 'min', 'max', 'median', 'stdev'];

        for (const col of numericColumns) {
            lines.push('');
            lines.push(`${col}:`);
            lines.push('-'.repeat(70));

            for (const func of statsFuncs) {
                const value = this.processor.aggregate(col, func);
                if (value !== null) {
                    lines.push(`  ${func.padEnd(10)} ${value.toFixed(2).padStart(15)}`);
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Generate grouped summary report
     */
    groupSummary(groupBy, aggregateCol, aggFunc = 'sum') {
        const lines = [];
        lines.push('');
        lines.push('='.repeat(70));
        lines.push(`GROUPED BY: ${groupBy}`);
        lines.push('='.repeat(70));

        const groups = this.processor.groupBy(groupBy);
        const results = [];

        for (const [groupName, rows] of Object.entries(groups)) {
            const tempProcessor = new CSVProcessor('');
            tempProcessor.data = rows;
            tempProcessor.headers = this.processor.headers;

            const aggValue = tempProcessor.aggregate(aggregateCol, aggFunc);
            results.push([groupName, rows.length, aggValue || 0]);
        }

        // Sort by aggregated value
        results.sort((a, b) => b[2] - a[2]);

        lines.push(`${'Group'.padEnd(30)} ${'Count'.padEnd(10)} ${aggFunc}(${aggregateCol})`.padEnd(15));
        lines.push('-'.repeat(70));

        for (const [groupName, count, aggValue] of results) {
            lines.push(`${String(groupName).padEnd(30)} ${String(count).padEnd(10)} ${aggValue.toFixed(2).padStart(15)}`);
        }

        return lines.join('\n');
    }

    /**
     * Generate top N values report
     */
    topNReport(column, n = 10) {
        const lines = [];
        lines.push('');
        lines.push('='.repeat(70));
        lines.push(`TOP ${n} - ${column}`);
        lines.push('='.repeat(70));

        const valueCounts = this.processor.valueCounts(column);
        const topItems = Object.entries(valueCounts).slice(0, n);

        lines.push(`${'Value'.padEnd(40)} ${'Count'.padEnd(10)}`);
        lines.push('-'.repeat(70));

        for (const [value, count] of topItems) {
            lines.push(`${String(value).padEnd(40)} ${String(count).padEnd(10)}`);
        }

        return lines.join('\n');
    }

    /**
     * Save complete report to file
     */
    saveReport(filepath, ...reportSections) {
        try {
            const content = reportSections.join('\n\n');
            fs.writeFileSync(filepath, content, 'utf8');
            console.log(`✓ Report saved to ${filepath}`);
            return true;
        } catch (error) {
            console.log(`✗ Error saving report: ${error.message}`);
            return false;
        }
    }
}

/**
 * Create sample sales data
 */
function createSampleData() {
    const sampleFile = '/tmp/sales_data.csv';
    const products = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Webcam', 'Headset'];
    const regions = ['North', 'South', 'East', 'West'];

    const lines = ['Date,Product,Region,Quantity,Price,Revenue'];

    for (let i = 0; i < 100; i++) {
        const date = `2024-01-${String((i % 28) + 1).padStart(2, '0')}`;
        const product = products[Math.floor(Math.random() * products.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const quantity = Math.floor(Math.random() * 10) + 1;
        const price = (Math.floor(Math.random() * 18) + 2) * 100;
        const revenue = quantity * price;

        lines.push(`${date},${product},${region},${quantity},${price},${revenue}`);
    }

    fs.writeFileSync(sampleFile, lines.join('\n'));
    return sampleFile;
}

/**
 * Demo
 */
function demo() {
    console.log('='.repeat(70));
    console.log('FILE PROCESSOR & REPORT GENERATOR DEMO');
    console.log('='.repeat(70));
    console.log();

    // Create sample data
    console.log('--- Creating Sample Data ---');
    const sampleFile = createSampleData();

    // Load and process
    console.log('\n--- Loading Data ---');
    const processor = new CSVProcessor(sampleFile);
    processor.load();

    // Generate reports
    console.log('\n--- Generating Reports ---');
    const reporter = new ReportGenerator(processor);

    const summary = reporter.summaryReport();
    console.log(summary);

    const numericStats = reporter.numericStatistics(['Quantity', 'Price', 'Revenue']);
    console.log(numericStats);

    const grouped = reporter.groupSummary('Region', 'Revenue', 'sum');
    console.log(grouped);

    const topProducts = reporter.topNReport('Product', 5);
    console.log(topProducts);

    // Save complete report
    console.log('\n--- Saving Report ---');
    const reportFile = '/tmp/sales_report.txt';
    reporter.saveReport(reportFile, summary, numericStats, grouped, topProducts);

    // Filter and save subset
    console.log('\n--- Filtering Data ---');
    const highRevenue = processor.filter(row => parseFloat(row.Revenue) > 5000);
    console.log(`Found ${highRevenue.length} high-revenue transactions`);

    const filteredFile = '/tmp/high_revenue_sales.csv';
    processor.save(filteredFile, highRevenue);

    // Cleanup
    fs.unlinkSync(sampleFile);
    fs.unlinkSync(reportFile);
    fs.unlinkSync(filteredFile);

    console.log('\n' + '='.repeat(70));
    console.log('✓ Demo completed successfully!');
    console.log('='.repeat(70));
}

// Run demo if executed directly
if (require.main === module) {
    demo();
}

module.exports = { CSVProcessor, ReportGenerator };
