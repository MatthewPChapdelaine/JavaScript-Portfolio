#!/usr/bin/env node
/**
 * Sorting Algorithms - Implementation and performance comparison
 * 
 * Run: node sorting-algorithms.js
 * 
 * Features:
 * - Quicksort implementation
 * - Mergesort implementation
 * - Bubble sort implementation
 * - Performance comparison with large datasets
 * - Visualization of results
 */

class SortingAlgorithms {
    /**
     * Quicksort - Divide and conquer algorithm
     * Average: O(n log n), Worst: O(n²), Space: O(log n)
     */
    static quicksort(arr) {
        if (arr.length <= 1) {
            return arr;
        }

        const pivot = arr[Math.floor(arr.length / 2)];
        const left = arr.filter(x => x < pivot);
        const middle = arr.filter(x => x === pivot);
        const right = arr.filter(x => x > pivot);

        return [...this.quicksort(left), ...middle, ...this.quicksort(right)];
    }

    /**
     * In-place quicksort for better space complexity
     */
    static quicksortInplace(arr, low = 0, high = arr.length - 1) {
        if (low < high) {
            const pivotIndex = this._partition(arr, low, high);
            this.quicksortInplace(arr, low, pivotIndex - 1);
            this.quicksortInplace(arr, pivotIndex + 1, high);
        }
        return arr;
    }

    static _partition(arr, low, high) {
        const pivot = arr[high];
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }

        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        return i + 1;
    }

    /**
     * Mergesort - Stable divide and conquer algorithm
     * Time: O(n log n), Space: O(n)
     */
    static mergesort(arr) {
        if (arr.length <= 1) {
            return arr;
        }

        const mid = Math.floor(arr.length / 2);
        const left = this.mergesort(arr.slice(0, mid));
        const right = this.mergesort(arr.slice(mid));

        return this._merge(left, right);
    }

    static _merge(left, right) {
        const result = [];
        let i = 0, j = 0;

        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) {
                result.push(left[i]);
                i++;
            } else {
                result.push(right[j]);
                j++;
            }
        }

        return result.concat(left.slice(i)).concat(right.slice(j));
    }

    /**
     * Bubble sort - Simple comparison-based algorithm
     * Time: O(n²), Space: O(1)
     */
    static bubblesort(arr) {
        arr = [...arr];
        const n = arr.length;

        for (let i = 0; i < n; i++) {
            let swapped = false;
            for (let j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                    swapped = true;
                }
            }
            if (!swapped) break;
        }

        return arr;
    }

    /**
     * Insertion sort - Efficient for small/nearly sorted arrays
     * Time: O(n²), Space: O(1)
     */
    static insertionSort(arr) {
        arr = [...arr];

        for (let i = 1; i < arr.length; i++) {
            const key = arr[i];
            let j = i - 1;

            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }

            arr[j + 1] = key;
        }

        return arr;
    }

    /**
     * Selection sort - Simple but inefficient
     * Time: O(n²), Space: O(1)
     */
    static selectionSort(arr) {
        arr = [...arr];
        const n = arr.length;

        for (let i = 0; i < n; i++) {
            let minIdx = i;
            for (let j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }

            [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        }

        return arr;
    }
}

class PerformanceTester {
    constructor() {
        this.results = [];
    }

    /**
     * Time a sorting algorithm
     */
    timeAlgorithm(func, arr, name) {
        const arrCopy = [...arr];
        const startTime = Date.now();
        const result = func(arrCopy);
        const endTime = Date.now();
        const elapsed = (endTime - startTime) / 1000;

        return { elapsed, result };
    }

    /**
     * Verify array is sorted
     */
    verifySorted(arr) {
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] > arr[i + 1]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Test a single algorithm
     */
    testAlgorithm(func, arr, name) {
        console.log(`\nTesting ${name}...`);
        console.log(`  Input size: ${arr.length}`);

        const { elapsed, result } = this.timeAlgorithm(func, arr, name);
        const isCorrect = this.verifySorted(result);

        console.log(`  Time: ${elapsed.toFixed(6)} seconds`);
        console.log(`  Correct: ${isCorrect ? '✓' : '✗'}`);

        this.results.push({
            name,
            time: elapsed,
            size: arr.length,
            correct: isCorrect
        });
    }

    /**
     * Compare all sorting algorithms
     */
    compareAll(arr) {
        console.log('='.repeat(60));
        console.log('Comparing Sorting Algorithms');
        console.log(`Array size: ${arr.length}`);
        console.log('='.repeat(60));

        const algorithms = [
            [a => SortingAlgorithms.quicksort(a), 'Quicksort'],
            [a => SortingAlgorithms.mergesort(a), 'Mergesort'],
            [a => SortingAlgorithms.bubblesort(a), 'Bubble Sort'],
            [a => SortingAlgorithms.insertionSort(a), 'Insertion Sort'],
            [a => SortingAlgorithms.selectionSort(a), 'Selection Sort']
        ];

        for (const [func, name] of algorithms) {
            this.testAlgorithm(func, arr, name);
        }

        this.printSummary();
    }

    /**
     * Print performance summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('Performance Summary (sorted by time)');
        console.log('='.repeat(60));

        const sorted = this.results.sort((a, b) => a.time - b.time);

        console.log(`${'Rank'.padEnd(6)} ${'Algorithm'.padEnd(20)} ${'Time (s)'.padEnd(15)} Status`);
        console.log('-'.repeat(60));

        sorted.forEach((result, i) => {
            const status = result.correct ? '✓ Correct' : '✗ Failed';
            const rank = (i + 1).toString().padEnd(6);
            const name = result.name.padEnd(20);
            const time = result.time.toFixed(6).padEnd(15);
            console.log(`${rank} ${name} ${time} ${status}`);
        });

        if (sorted.length > 0) {
            const fastest = sorted[0];
            const slowest = sorted[sorted.length - 1];
            const speedup = (slowest.time / fastest.time).toFixed(2);
            console.log(`\n${fastest.name} was ${speedup}x faster than ${slowest.name}`);
        }
    }
}

/**
 * Generate test data
 */
function generateTestData(size, type = 'random') {
    if (type === 'random') {
        return Array.from({ length: size }, () => Math.floor(Math.random() * size * 10));
    } else if (type === 'sorted') {
        return Array.from({ length: size }, (_, i) => i);
    } else if (type === 'reversed') {
        return Array.from({ length: size }, (_, i) => size - i);
    } else if (type === 'nearly_sorted') {
        const arr = Array.from({ length: size }, (_, i) => i);
        const swaps = Math.floor(size / 20);
        for (let i = 0; i < swaps; i++) {
            const idx1 = Math.floor(Math.random() * size);
            const idx2 = Math.floor(Math.random() * size);
            [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
        }
        return arr;
    }
    return Array.from({ length: size }, () => Math.floor(Math.random() * size * 10));
}

/**
 * Basic demonstration
 */
function demoBasic() {
    console.log('=== Basic Sorting Demo ===\n');

    const testArr = [64, 34, 25, 12, 22, 11, 90, 88, 45, 50];
    console.log(`Original array: [${testArr}]\n`);

    const algorithms = [
        ['Quicksort', a => SortingAlgorithms.quicksort(a)],
        ['Mergesort', a => SortingAlgorithms.mergesort(a)],
        ['Bubble Sort', a => SortingAlgorithms.bubblesort(a)],
        ['Insertion Sort', a => SortingAlgorithms.insertionSort(a)],
        ['Selection Sort', a => SortingAlgorithms.selectionSort(a)]
    ];

    for (const [name, func] of algorithms) {
        const sorted = func([...testArr]);
        console.log(`${name}: [${sorted}]`);
    }

    console.log();
}

/**
 * Performance comparison
 */
function demoPerformance() {
    console.log('=== Performance Comparison ===\n');

    const sizes = [100, 500, 1000];

    for (const size of sizes) {
        console.log('\n' + '#'.repeat(60));
        console.log(`Testing with ${size} elements`);
        console.log('#'.repeat(60));

        const tester = new PerformanceTester();
        const testData = generateTestData(size, 'random');
        tester.compareAll(testData);
    }
}

/**
 * Main demo program
 */
function main() {
    console.log('='.repeat(60));
    console.log('SORTING ALGORITHMS - Implementation & Performance');
    console.log('='.repeat(60));
    console.log();

    demoBasic();
    demoPerformance();

    console.log('\n' + '='.repeat(60));
    console.log('✓ All demos completed successfully!');
    console.log('='.repeat(60));
}

// Run demo if executed directly
if (require.main === module) {
    main();
}

module.exports = SortingAlgorithms;
