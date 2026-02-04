const fs = require('fs');
const path = require('path');

// Create sample registry packages
const registryPath = path.join(__dirname, '..', 'registry');

if (!fs.existsSync(registryPath)) {
  fs.mkdirSync(registryPath, { recursive: true });
}

const packages = [
  {
    name: 'lodash',
    version: '4.17.21',
    description: 'Lodash modular utilities',
    author: 'John Doe',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'express',
    version: '4.18.2',
    description: 'Fast, unopinionated, minimalist web framework',
    author: 'TJ Holowaychuk',
    license: 'MIT',
    dependencies: {
      'body-parser': '^1.20.0',
      'cookie': '^0.5.0',
      'debug': '^2.6.9'
    }
  },
  {
    name: 'body-parser',
    version: '1.20.1',
    description: 'Node.js body parsing middleware',
    author: 'Express Team',
    license: 'MIT',
    dependencies: {
      'bytes': '^3.1.2',
      'debug': '^2.6.9'
    }
  },
  {
    name: 'cookie',
    version: '0.5.0',
    description: 'HTTP server cookie parsing and serialization',
    author: 'Roman Shtylman',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'debug',
    version: '2.6.9',
    description: 'Small debugging utility',
    author: 'TJ Holowaychuk',
    license: 'MIT',
    dependencies: {
      'ms': '^2.0.0'
    }
  },
  {
    name: 'ms',
    version: '2.1.3',
    description: 'Tiny millisecond conversion utility',
    author: 'Guillermo Rauch',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'bytes',
    version: '3.1.2',
    description: 'Utility to parse a string bytes to bytes and vice-versa',
    author: 'TJ Holowaychuk',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'react',
    version: '18.2.0',
    description: 'React is a JavaScript library for building user interfaces',
    author: 'Facebook',
    license: 'MIT',
    dependencies: {
      'loose-envify': '^1.1.0'
    }
  },
  {
    name: 'react-dom',
    version: '18.2.0',
    description: 'React package for working with the DOM',
    author: 'Facebook',
    license: 'MIT',
    dependencies: {
      'react': '^18.2.0',
      'scheduler': '^0.23.0'
    }
  },
  {
    name: 'scheduler',
    version: '0.23.0',
    description: 'Cooperative scheduler for the browser environment',
    author: 'Facebook',
    license: 'MIT',
    dependencies: {
      'loose-envify': '^1.1.0'
    }
  },
  {
    name: 'loose-envify',
    version: '1.4.0',
    description: 'Fast (and loose) selective process.env replacer',
    author: 'Andres Suarez',
    license: 'MIT',
    dependencies: {
      'js-tokens': '^3.0.0 || ^4.0.0'
    }
  },
  {
    name: 'js-tokens',
    version: '4.0.0',
    description: 'A regex that tokenizes JavaScript',
    author: 'Simon Lydell',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'axios',
    version: '1.4.0',
    description: 'Promise based HTTP client for the browser and node.js',
    author: 'Matt Zabriskie',
    license: 'MIT',
    dependencies: {
      'follow-redirects': '^1.15.0'
    }
  },
  {
    name: 'follow-redirects',
    version: '1.15.2',
    description: 'HTTP and HTTPS modules that follow redirects',
    author: 'Ruben Verborgh',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'moment',
    version: '2.29.4',
    description: 'Parse, validate, manipulate, and display dates',
    author: 'Iskren Ivov Chernev',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'chalk',
    version: '4.1.2',
    description: 'Terminal string styling done right',
    author: 'Sindre Sorhus',
    license: 'MIT',
    dependencies: {
      'ansi-styles': '^4.1.0',
      'supports-color': '^7.1.0'
    }
  },
  {
    name: 'ansi-styles',
    version: '4.3.0',
    description: 'ANSI escape codes for styling strings in the terminal',
    author: 'Sindre Sorhus',
    license: 'MIT',
    dependencies: {
      'color-convert': '^2.0.1'
    }
  },
  {
    name: 'color-convert',
    version: '2.0.1',
    description: 'Plain color conversion functions',
    author: 'Heather Arthur',
    license: 'MIT',
    dependencies: {
      'color-name': '^1.0.0'
    }
  },
  {
    name: 'color-name',
    version: '1.1.4',
    description: 'A list of color names and their values',
    author: 'DY',
    license: 'MIT',
    dependencies: {}
  },
  {
    name: 'supports-color',
    version: '7.2.0',
    description: 'Detect whether a terminal supports color',
    author: 'Sindre Sorhus',
    license: 'MIT',
    dependencies: {
      'has-flag': '^4.0.0'
    }
  },
  {
    name: 'has-flag',
    version: '4.0.0',
    description: 'Check if argv has a specific flag',
    author: 'Sindre Sorhus',
    license: 'MIT',
    dependencies: {}
  }
];

// Write packages to registry
packages.forEach(pkg => {
  const filePath = path.join(registryPath, `${pkg.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
  console.log(`✓ Created ${pkg.name}.json`);
});

console.log(`\n✓ Registry setup complete! Created ${packages.length} packages.`);
