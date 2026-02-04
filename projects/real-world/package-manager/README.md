# Mini Package Manager

A simplified NPM-like package manager that demonstrates dependency resolution, lock file generation, and dependency graph visualization.

## Features

- **Package Installation**: Install packages and their dependencies
- **Dependency Resolution**: Automatically resolve and install nested dependencies
- **Lock File**: Generate lock files for reproducible installs
- **Simulated Registry**: Local package registry with popular packages
- **Dependency Graph**: Visualize dependencies with interactive graph (vis.js)
- **CLI Interface**: Full-featured command-line interface with commander.js
- **Semantic Versioning**: Support for semver version ranges
- **Package Management**: Install, uninstall, list, and get info on packages

## Installation

1. **Navigate to the project directory**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the package registry**:
   ```bash
   npm run setup-registry
   ```

4. **Link the CLI tool** (optional, for global access):
   ```bash
   npm link
   ```

## Usage

### Install Packages

**Install a specific package**:
```bash
node bin/mini-pkg.js install express
node bin/mini-pkg.js install lodash axios
```

**Install from package.json**:
```bash
node bin/mini-pkg.js install
```

**Install as dev dependency**:
```bash
node bin/mini-pkg.js install --save-dev chalk
```

### Uninstall Packages

```bash
node bin/mini-pkg.js uninstall express
```

### List Installed Packages

```bash
node bin/mini-pkg.js list
```

### Get Package Info

```bash
node bin/mini-pkg.js info express
```

### Visualize Dependency Graph

```bash
node bin/mini-pkg.js graph
```

This will generate an HTML file and open it in your browser showing an interactive dependency graph.

### Clean Project

```bash
node bin/mini-pkg.js clean
```

Removes `node_modules/` and `mini-pkg-lock.json`.

## Testing

A test project is included to verify functionality:

```bash
cd test-project
node ../bin/mini-pkg.js install express
node test.js
```

## How It Works

### 1. Package Registry

The simulated registry is a collection of JSON files in the `registry/` directory. Each file represents a package with metadata:

```json
{
  "name": "express",
  "version": "4.18.2",
  "description": "Fast, unopinionated, minimalist web framework",
  "dependencies": {
    "body-parser": "^1.20.0",
    "cookie": "^0.5.0"
  }
}
```

### 2. Dependency Resolution

The package manager recursively resolves all dependencies:

1. Read package metadata from registry
2. Parse version requirements (supports semver)
3. Recursively resolve nested dependencies
4. Build a flat dependency tree
5. Detect and avoid circular dependencies

### 3. Installation

For each resolved package:

1. Create `node_modules/package-name/` directory
2. Write `package.json` with package metadata
3. Create a basic `index.js` (stub implementation)
4. Update project's `package.json`
5. Generate `mini-pkg-lock.json`

### 4. Lock File

The lock file ensures reproducible installs:

```json
{
  "name": "test-project",
  "version": "1.0.0",
  "lockfileVersion": 1,
  "dependencies": {
    "express": {
      "version": "4.18.2",
      "dependencies": {
        "body-parser": "^1.20.0"
      }
    }
  }
}
```

### 5. Dependency Graph

Uses vis.js to create an interactive visualization:

- Hierarchical layout showing dependency relationships
- Click and drag to explore
- Hover for details
- Zoom and pan controls

## Available Registry Packages

The simulated registry includes:

- **Web Frameworks**: express
- **Utilities**: lodash, axios, moment, chalk
- **React**: react, react-dom
- **Dependencies**: body-parser, cookie, debug, ms, and more

Run `npm run setup-registry` to populate the registry.

## Project Structure

```
package-manager/
├── bin/
│   └── mini-pkg.js           # CLI entry point
├── lib/
│   ├── PackageManager.js     # Core package manager logic
│   ├── DependencyGraph.js    # Graph visualization
│   └── setup-registry.js     # Registry setup script
├── registry/
│   ├── express.json          # Package metadata files
│   ├── lodash.json
│   └── ...
├── test-project/
│   ├── package.json          # Test project
│   └── test.js               # Test script
├── package.json
└── README.md
```

## CLI Commands Reference

### install [packages...]
Install packages and dependencies.

**Options**:
- `-D, --save-dev`: Save as dev dependency
- `-g, --global`: Install globally (not implemented)

**Examples**:
```bash
mini-pkg install express
mini-pkg install lodash axios --save-dev
mini-pkg install
```

### uninstall <packages...>
Remove packages.

**Example**:
```bash
mini-pkg uninstall express lodash
```

### list
List all installed packages.

**Example**:
```bash
mini-pkg list
```

### info <package>
Show detailed package information.

**Example**:
```bash
mini-pkg info express
```

### graph
Generate and display dependency graph.

**Example**:
```bash
mini-pkg graph
```

### clean
Remove node_modules and lock file.

**Example**:
```bash
mini-pkg clean
```

## Advanced Features

### Semantic Versioning

Supports semver ranges:
- `^1.2.3` - Compatible with 1.2.3
- `~1.2.3` - Approximately 1.2.3
- `*` or `latest` - Latest version
- `1.2.3` - Exact version

### Dependency Resolution Algorithm

1. **Breadth-First Search**: Explore dependencies level by level
2. **Deduplication**: Avoid installing same package twice
3. **Version Matching**: Use semver to find compatible versions
4. **Circular Detection**: Prevent infinite loops

### Lock File Benefits

- **Reproducibility**: Same dependencies across environments
- **Version Locking**: Prevent unexpected updates
- **Audit Trail**: Track exact versions installed
- **Faster Installs**: Skip resolution when lock file exists

## Extending the Package Manager

### Adding New Packages to Registry

Create a JSON file in `registry/`:

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "description": "My awesome package",
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

### Custom Commands

Add new commands in `bin/mini-pkg.js`:

```javascript
program
  .command('my-command')
  .description('My custom command')
  .action(() => {
    // Implementation
  });
```

## Limitations

This is a simplified educational implementation:

- No actual package downloading (uses local registry)
- Simplified version resolution
- No peer dependencies support
- No package scripts execution
- No authentication/publishing
- Limited error handling

## Real-World Comparison

| Feature | mini-pkg | npm |
|---------|----------|-----|
| Dependency Resolution | ✓ | ✓ |
| Lock Files | ✓ | ✓ |
| Semantic Versioning | ✓ | ✓ |
| Registry | Local | Remote |
| Publishing | ✗ | ✓ |
| Scripts | ✗ | ✓ |
| Peer Dependencies | ✗ | ✓ |
| Security Audit | ✗ | ✓ |

## Contributing

This is an educational project. Feel free to extend it with:

- Remote registry support
- Package publishing
- Script execution
- Workspace support
- Performance optimizations

## License

MIT License - feel free to use this project for learning or teaching purposes.

## Learning Resources

This project demonstrates:

- **Algorithm Design**: Dependency resolution algorithms
- **Graph Theory**: Dependency graphs and traversal
- **File System Operations**: Managing node_modules
- **CLI Development**: Building command-line tools
- **Package Management**: How npm/yarn work internally
- **Semantic Versioning**: Version constraint resolution

## Troubleshooting

**Command not found**:
- Use `node bin/mini-pkg.js` instead
- Or run `npm link` to install globally

**Package not found**:
- Check if package exists in `registry/`
- Run `npm run setup-registry` to populate

**Dependency resolution fails**:
- Verify package.json syntax
- Check for circular dependencies
- Ensure all dependencies exist in registry

**Graph not opening**:
- Check if HTML file was generated
- Try opening `dependency-graph.html` manually
- Ensure vis.js CDN is accessible
