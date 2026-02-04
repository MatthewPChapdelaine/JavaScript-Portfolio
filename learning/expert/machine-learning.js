#!/usr/bin/env node

/**
 * MACHINE LEARNING LIBRARY
 * 
 * A comprehensive ML library implemented from scratch with:
 * - Neural Networks with backpropagation
 * - Linear Regression
 * - Logistic Regression
 * - Training utilities (gradient descent, mini-batch, etc.)
 * - Activation functions
 * - Loss functions
 * - Data preprocessing
 * 
 * No external ML libraries - pure JavaScript implementation
 */

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

class Matrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    this.data = data || Array(rows).fill(0).map(() => Array(cols).fill(0));
  }

  static fromArray(arr) {
    const m = new Matrix(arr.length, 1);
    for (let i = 0; i < arr.length; i++) {
      m.data[i][0] = arr[i];
    }
    return m;
  }

  toArray() {
    const arr = [];
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        arr.push(this.data[i][j]);
      }
    }
    return arr;
  }

  static multiply(a, b) {
    if (a.cols !== b.rows) {
      throw new Error('Matrix dimensions incompatible for multiplication');
    }

    const result = new Matrix(a.rows, b.cols);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        let sum = 0;
        for (let k = 0; k < a.cols; k++) {
          sum += a.data[i][k] * b.data[k][j];
        }
        result.data[i][j] = sum;
      }
    }
    return result;
  }

  multiply(n) {
    if (n instanceof Matrix) {
      // Element-wise multiplication
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
          this.data[i][j] *= n.data[i][j];
        }
      }
    } else {
      // Scalar multiplication
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
          this.data[i][j] *= n;
        }
      }
    }
  }

  static transpose(matrix) {
    const result = new Matrix(matrix.cols, matrix.rows);
    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.cols; j++) {
        result.data[j][i] = matrix.data[i][j];
      }
    }
    return result;
  }

  static add(a, b) {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      throw new Error('Matrix dimensions must match for addition');
    }

    const result = new Matrix(a.rows, a.cols);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        result.data[i][j] = a.data[i][j] + b.data[i][j];
      }
    }
    return result;
  }

  add(n) {
    if (n instanceof Matrix) {
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
          this.data[i][j] += n.data[i][j];
        }
      }
    } else {
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
          this.data[i][j] += n;
        }
      }
    }
  }

  static subtract(a, b) {
    const result = new Matrix(a.rows, a.cols);
    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        result.data[i][j] = a.data[i][j] - b.data[i][j];
      }
    }
    return result;
  }

  map(fn) {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.data[i][j] = fn(this.data[i][j], i, j);
      }
    }
  }

  static map(matrix, fn) {
    const result = new Matrix(matrix.rows, matrix.cols);
    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.cols; j++) {
        result.data[i][j] = fn(matrix.data[i][j], i, j);
      }
    }
    return result;
  }

  randomize() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.data[i][j] = Math.random() * 2 - 1;
      }
    }
  }

  copy() {
    const m = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        m.data[i][j] = this.data[i][j];
      }
    }
    return m;
  }
}

// ============================================================================
// ACTIVATION FUNCTIONS
// ============================================================================

class ActivationFunctions {
  static sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  static sigmoidDerivative(y) {
    return y * (1 - y);
  }

  static tanh(x) {
    return Math.tanh(x);
  }

  static tanhDerivative(y) {
    return 1 - (y * y);
  }

  static relu(x) {
    return Math.max(0, x);
  }

  static reluDerivative(x) {
    return x > 0 ? 1 : 0;
  }

  static leakyRelu(x, alpha = 0.01) {
    return x > 0 ? x : alpha * x;
  }

  static leakyReluDerivative(x, alpha = 0.01) {
    return x > 0 ? 1 : alpha;
  }

  static softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }
}

// ============================================================================
// LOSS FUNCTIONS
// ============================================================================

class LossFunctions {
  static meanSquaredError(predicted, actual) {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      const error = predicted[i] - actual[i];
      sum += error * error;
    }
    return sum / predicted.length;
  }

  static crossEntropy(predicted, actual) {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      sum += actual[i] * Math.log(predicted[i] + 1e-15);
    }
    return -sum;
  }

  static binaryCrossEntropy(predicted, actual) {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      sum += actual[i] * Math.log(predicted[i] + 1e-15) +
             (1 - actual[i]) * Math.log(1 - predicted[i] + 1e-15);
    }
    return -sum / predicted.length;
  }
}

// ============================================================================
// NEURAL NETWORK
// ============================================================================

class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes, learningRate = 0.1) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;
    this.learningRate = learningRate;

    this.weightsIH = new Matrix(this.hiddenNodes, this.inputNodes);
    this.weightsHO = new Matrix(this.outputNodes, this.hiddenNodes);
    this.weightsIH.randomize();
    this.weightsHO.randomize();

    this.biasH = new Matrix(this.hiddenNodes, 1);
    this.biasO = new Matrix(this.outputNodes, 1);
    this.biasH.randomize();
    this.biasO.randomize();

    this.activationFunction = ActivationFunctions.sigmoid;
    this.activationDerivative = ActivationFunctions.sigmoidDerivative;
  }

  setActivationFunction(activation) {
    const functions = {
      sigmoid: {
        fn: ActivationFunctions.sigmoid,
        dfn: ActivationFunctions.sigmoidDerivative
      },
      tanh: {
        fn: ActivationFunctions.tanh,
        dfn: ActivationFunctions.tanhDerivative
      },
      relu: {
        fn: ActivationFunctions.relu,
        dfn: ActivationFunctions.reluDerivative
      }
    };

    if (functions[activation]) {
      this.activationFunction = functions[activation].fn;
      this.activationDerivative = functions[activation].dfn;
    }
  }

  feedforward(inputArray) {
    // Input to hidden
    const inputs = Matrix.fromArray(inputArray);
    const hidden = Matrix.multiply(this.weightsIH, inputs);
    hidden.add(this.biasH);
    hidden.map(this.activationFunction);

    // Hidden to output
    const output = Matrix.multiply(this.weightsHO, hidden);
    output.add(this.biasO);
    output.map(this.activationFunction);

    return output.toArray();
  }

  train(inputArray, targetArray) {
    // Feedforward
    const inputs = Matrix.fromArray(inputArray);
    
    const hidden = Matrix.multiply(this.weightsIH, inputs);
    hidden.add(this.biasH);
    hidden.map(this.activationFunction);

    const outputs = Matrix.multiply(this.weightsHO, hidden);
    outputs.add(this.biasO);
    outputs.map(this.activationFunction);

    // Convert targets to matrix
    const targets = Matrix.fromArray(targetArray);

    // Calculate output errors
    const outputErrors = Matrix.subtract(targets, outputs);

    // Calculate gradients for output layer
    const gradients = Matrix.map(outputs, this.activationDerivative);
    gradients.multiply(outputErrors);
    gradients.multiply(this.learningRate);

    // Calculate deltas for hidden->output weights
    const hiddenT = Matrix.transpose(hidden);
    const weightsHODeltas = Matrix.multiply(gradients, hiddenT);

    // Adjust weights and bias
    this.weightsHO.add(weightsHODeltas);
    this.biasO.add(gradients);

    // Calculate hidden errors
    const weightsHOT = Matrix.transpose(this.weightsHO);
    const hiddenErrors = Matrix.multiply(weightsHOT, outputErrors);

    // Calculate gradients for hidden layer
    const hiddenGradients = Matrix.map(hidden, this.activationDerivative);
    hiddenGradients.multiply(hiddenErrors);
    hiddenGradients.multiply(this.learningRate);

    // Calculate deltas for input->hidden weights
    const inputsT = Matrix.transpose(inputs);
    const weightsIHDeltas = Matrix.multiply(hiddenGradients, inputsT);

    // Adjust weights and bias
    this.weightsIH.add(weightsIHDeltas);
    this.biasH.add(hiddenGradients);
  }

  trainBatch(trainingData, epochs = 1000, verbose = false) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;

      for (const data of trainingData) {
        this.train(data.input, data.output);
        
        const predicted = this.feedforward(data.input);
        totalError += LossFunctions.meanSquaredError(predicted, data.output);
      }

      if (verbose && epoch % 100 === 0) {
        console.log(`Epoch ${epoch}: Average Error = ${(totalError / trainingData.length).toFixed(6)}`);
      }
    }
  }

  serialize() {
    return JSON.stringify({
      inputNodes: this.inputNodes,
      hiddenNodes: this.hiddenNodes,
      outputNodes: this.outputNodes,
      learningRate: this.learningRate,
      weightsIH: this.weightsIH,
      weightsHO: this.weightsHO,
      biasH: this.biasH,
      biasO: this.biasO
    });
  }

  static deserialize(data) {
    const obj = JSON.parse(data);
    const nn = new NeuralNetwork(obj.inputNodes, obj.hiddenNodes, obj.outputNodes);
    nn.weightsIH = Object.assign(new Matrix(1, 1), obj.weightsIH);
    nn.weightsHO = Object.assign(new Matrix(1, 1), obj.weightsHO);
    nn.biasH = Object.assign(new Matrix(1, 1), obj.biasH);
    nn.biasO = Object.assign(new Matrix(1, 1), obj.biasO);
    nn.learningRate = obj.learningRate;
    return nn;
  }
}

// ============================================================================
// LINEAR REGRESSION
// ============================================================================

class LinearRegression {
  constructor(learningRate = 0.01) {
    this.learningRate = learningRate;
    this.weights = null;
    this.bias = 0;
  }

  fit(X, y, epochs = 1000, verbose = false) {
    const m = X.length;
    const n = X[0].length;

    // Initialize weights
    this.weights = Array(n).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Predictions
      const predictions = X.map(x => this.predict(x));

      // Calculate gradients
      const dWeights = Array(n).fill(0);
      let dBias = 0;

      for (let i = 0; i < m; i++) {
        const error = predictions[i] - y[i];
        dBias += error;
        for (let j = 0; j < n; j++) {
          dWeights[j] += error * X[i][j];
        }
      }

      // Update parameters
      for (let j = 0; j < n; j++) {
        this.weights[j] -= (this.learningRate * dWeights[j]) / m;
      }
      this.bias -= (this.learningRate * dBias) / m;

      if (verbose && epoch % 100 === 0) {
        const mse = this.meanSquaredError(X, y);
        console.log(`Epoch ${epoch}: MSE = ${mse.toFixed(6)}`);
      }
    }
  }

  predict(x) {
    let sum = this.bias;
    for (let i = 0; i < x.length; i++) {
      sum += this.weights[i] * x[i];
    }
    return sum;
  }

  meanSquaredError(X, y) {
    let sum = 0;
    for (let i = 0; i < X.length; i++) {
      const error = this.predict(X[i]) - y[i];
      sum += error * error;
    }
    return sum / X.length;
  }

  rSquared(X, y) {
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < X.length; i++) {
      const pred = this.predict(X[i]);
      ssRes += Math.pow(y[i] - pred, 2);
      ssTot += Math.pow(y[i] - yMean, 2);
    }

    return 1 - (ssRes / ssTot);
  }
}

// ============================================================================
// LOGISTIC REGRESSION
// ============================================================================

class LogisticRegression {
  constructor(learningRate = 0.01) {
    this.learningRate = learningRate;
    this.weights = null;
    this.bias = 0;
  }

  sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  fit(X, y, epochs = 1000, verbose = false) {
    const m = X.length;
    const n = X[0].length;

    this.weights = Array(n).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const predictions = X.map(x => this.predictProba(x));

      const dWeights = Array(n).fill(0);
      let dBias = 0;

      for (let i = 0; i < m; i++) {
        const error = predictions[i] - y[i];
        dBias += error;
        for (let j = 0; j < n; j++) {
          dWeights[j] += error * X[i][j];
        }
      }

      for (let j = 0; j < n; j++) {
        this.weights[j] -= (this.learningRate * dWeights[j]) / m;
      }
      this.bias -= (this.learningRate * dBias) / m;

      if (verbose && epoch % 100 === 0) {
        const loss = this.logLoss(X, y);
        const acc = this.accuracy(X, y);
        console.log(`Epoch ${epoch}: Loss = ${loss.toFixed(4)}, Accuracy = ${acc.toFixed(4)}`);
      }
    }
  }

  predictProba(x) {
    let z = this.bias;
    for (let i = 0; i < x.length; i++) {
      z += this.weights[i] * x[i];
    }
    return this.sigmoid(z);
  }

  predict(x) {
    return this.predictProba(x) >= 0.5 ? 1 : 0;
  }

  logLoss(X, y) {
    let sum = 0;
    for (let i = 0; i < X.length; i++) {
      const p = this.predictProba(X[i]);
      sum += y[i] * Math.log(p + 1e-15) + (1 - y[i]) * Math.log(1 - p + 1e-15);
    }
    return -sum / X.length;
  }

  accuracy(X, y) {
    let correct = 0;
    for (let i = 0; i < X.length; i++) {
      if (this.predict(X[i]) === y[i]) {
        correct++;
      }
    }
    return correct / X.length;
  }
}

// ============================================================================
// DATA PREPROCESSING
// ============================================================================

class DataPreprocessor {
  static normalize(data) {
    const n = data[0].length;
    const means = Array(n).fill(0);
    const stds = Array(n).fill(0);

    // Calculate means
    for (const row of data) {
      for (let j = 0; j < n; j++) {
        means[j] += row[j];
      }
    }
    for (let j = 0; j < n; j++) {
      means[j] /= data.length;
    }

    // Calculate standard deviations
    for (const row of data) {
      for (let j = 0; j < n; j++) {
        stds[j] += Math.pow(row[j] - means[j], 2);
      }
    }
    for (let j = 0; j < n; j++) {
      stds[j] = Math.sqrt(stds[j] / data.length);
      if (stds[j] === 0) stds[j] = 1; // Avoid division by zero
    }

    // Normalize
    const normalized = data.map(row =>
      row.map((val, j) => (val - means[j]) / stds[j])
    );

    return { data: normalized, means, stds };
  }

  static trainTestSplit(X, y, testSize = 0.2, shuffle = true) {
    const indices = Array.from({ length: X.length }, (_, i) => i);

    if (shuffle) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }

    const splitIndex = Math.floor(X.length * (1 - testSize));

    const XTrain = indices.slice(0, splitIndex).map(i => X[i]);
    const XTest = indices.slice(splitIndex).map(i => X[i]);
    const yTrain = indices.slice(0, splitIndex).map(i => y[i]);
    const yTest = indices.slice(splitIndex).map(i => y[i]);

    return { XTrain, XTest, yTrain, yTest };
  }
}

// ============================================================================
// DEMONSTRATIONS
// ============================================================================

function demonstrateNeuralNetwork() {
  console.log('NEURAL NETWORK DEMONSTRATION');
  console.log('='.repeat(80));
  console.log('Training XOR problem...\n');

  const nn = new NeuralNetwork(2, 4, 1, 0.5);

  const trainingData = [
    { input: [0, 0], output: [0] },
    { input: [0, 1], output: [1] },
    { input: [1, 0], output: [1] },
    { input: [1, 1], output: [0] }
  ];

  nn.trainBatch(trainingData, 10000, true);

  console.log('\nTesting trained network:');
  console.log('-'.repeat(40));
  for (const data of trainingData) {
    const prediction = nn.feedforward(data.input)[0];
    console.log(`Input: [${data.input}] -> Predicted: ${prediction.toFixed(4)}, Expected: ${data.output[0]}`);
  }
  console.log('\n');
}

function demonstrateLinearRegression() {
  console.log('LINEAR REGRESSION DEMONSTRATION');
  console.log('='.repeat(80));
  console.log('Fitting line to data: y = 2x + 3 + noise\n');

  // Generate synthetic data
  const X = [];
  const y = [];
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 10;
    const noise = (Math.random() - 0.5) * 2;
    X.push([x]);
    y.push(2 * x + 3 + noise);
  }

  const lr = new LinearRegression(0.01);
  lr.fit(X, y, 1000, true);

  console.log(`\nLearned parameters:`);
  console.log(`  Weight: ${lr.weights[0].toFixed(4)} (expected: ~2.0)`);
  console.log(`  Bias: ${lr.bias.toFixed(4)} (expected: ~3.0)`);
  console.log(`  R²: ${lr.rSquared(X, y).toFixed(4)}\n`);

  console.log('Sample predictions:');
  console.log('-'.repeat(40));
  for (let i = 0; i < 5; i++) {
    const testX = i * 2;
    const pred = lr.predict([testX]);
    const actual = 2 * testX + 3;
    console.log(`  x=${testX}: predicted=${pred.toFixed(2)}, actual=${actual.toFixed(2)}`);
  }
  console.log('\n');
}

function demonstrateLogisticRegression() {
  console.log('LOGISTIC REGRESSION DEMONSTRATION');
  console.log('='.repeat(80));
  console.log('Binary classification problem\n');

  // Generate synthetic data
  const X = [];
  const y = [];

  // Class 0: cluster around (2, 2)
  for (let i = 0; i < 50; i++) {
    X.push([
      2 + (Math.random() - 0.5) * 2,
      2 + (Math.random() - 0.5) * 2
    ]);
    y.push(0);
  }

  // Class 1: cluster around (6, 6)
  for (let i = 0; i < 50; i++) {
    X.push([
      6 + (Math.random() - 0.5) * 2,
      6 + (Math.random() - 0.5) * 2
    ]);
    y.push(1);
  }

  const logReg = new LogisticRegression(0.1);
  logReg.fit(X, y, 1000, true);

  console.log(`\nFinal Accuracy: ${logReg.accuracy(X, y).toFixed(4)}`);
  console.log(`Final Loss: ${logReg.logLoss(X, y).toFixed(4)}\n`);

  console.log('Sample predictions:');
  console.log('-'.repeat(40));
  const testPoints = [[2, 2], [4, 4], [6, 6], [8, 8]];
  for (const point of testPoints) {
    const prob = logReg.predictProba(point);
    const pred = logReg.predict(point);
    console.log(`  Point [${point}]: Class ${pred} (probability: ${prob.toFixed(4)})`);
  }
  console.log('\n');
}

function demonstrateDataPreprocessing() {
  console.log('DATA PREPROCESSING DEMONSTRATION');
  console.log('='.repeat(80));

  const data = [
    [1, 100],
    [2, 200],
    [3, 300],
    [4, 400],
    [5, 500]
  ];

  console.log('Original data:');
  console.log(data);

  const normalized = DataPreprocessor.normalize(data);
  console.log('\nNormalized data:');
  console.log(normalized.data);
  console.log('\nMeans:', normalized.means);
  console.log('Stds:', normalized.stds);

  // Train-test split
  const X = Array.from({ length: 100 }, (_, i) => [i]);
  const y = Array.from({ length: 100 }, (_, i) => i * 2);

  const split = DataPreprocessor.trainTestSplit(X, y, 0.2, true);
  console.log(`\nTrain-Test Split:`);
  console.log(`  Training samples: ${split.XTrain.length}`);
  console.log(`  Test samples: ${split.XTest.length}`);
  console.log('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'MACHINE LEARNING LIBRARY' + ' '.repeat(34) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  demonstrateNeuralNetwork();
  demonstrateLinearRegression();
  demonstrateLogisticRegression();
  demonstrateDataPreprocessing();

  console.log('All demonstrations completed successfully!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  Matrix,
  ActivationFunctions,
  LossFunctions,
  NeuralNetwork,
  LinearRegression,
  LogisticRegression,
  DataPreprocessor
};
