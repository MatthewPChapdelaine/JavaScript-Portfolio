const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const semver = require('semver');

class PackageManager {
  constructor() {
    this.registryPath = path.join(__dirname, '..', 'registry');
    this.nodeModulesPath = path.join(process.cwd(), 'node_modules');
    this.lockFilePath = path.join(process.cwd(), 'mini-pkg-lock.json');
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
  }

  // Read package.json
  readPackageJson() {
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json not found in current directory');
    }
    return JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
  }

  // Read lock file
  readLockFile() {
    if (!fs.existsSync(this.lockFilePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8'));
  }

  // Write lock file
  writeLockFile(data) {
    fs.writeFileSync(this.lockFilePath, JSON.stringify(data, null, 2));
  }

  // Get package info from registry
  getPackageInfo(packageName, version = 'latest') {
    const packagePath = path.join(this.registryPath, `${packageName}.json`);
    
    if (!fs.existsSync(packagePath)) {
      return null;
    }

    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (version === 'latest' || version === '*') {
      return packageData;
    }

    // Handle version ranges
    if (semver.validRange(version)) {
      if (semver.satisfies(packageData.version, version)) {
        return packageData;
      }
    }

    return packageData;
  }

  // Resolve all dependencies recursively
  async resolveDependencies(packageName, version = 'latest', resolved = {}, depth = 0) {
    const spinner = ora({
      text: `Resolving ${packageName}@${version}`,
      indent: depth * 2
    }).start();

    const packageInfo = this.getPackageInfo(packageName, version);
    
    if (!packageInfo) {
      spinner.fail(`Package ${packageName} not found in registry`);
      throw new Error(`Package ${packageName} not found`);
    }

    const key = `${packageName}@${packageInfo.version}`;
    
    if (resolved[key]) {
      spinner.info(`${packageName}@${packageInfo.version} (already resolved)`);
      return resolved;
    }

    resolved[key] = {
      name: packageName,
      version: packageInfo.version,
      dependencies: packageInfo.dependencies || {}
    };

    spinner.succeed(`${packageName}@${packageInfo.version}`);

    // Resolve dependencies
    if (packageInfo.dependencies) {
      for (const [depName, depVersion] of Object.entries(packageInfo.dependencies)) {
        await this.resolveDependencies(depName, depVersion, resolved, depth + 1);
      }
    }

    return resolved;
  }

  // Install packages
  async install(packages, saveDev = false) {
    const packageJson = this.readPackageJson();
    const resolved = {};

    // Resolve all packages
    for (const pkg of packages) {
      const [name, version] = pkg.split('@');
      await this.resolveDependencies(name, version || 'latest', resolved);
    }

    // Create node_modules
    if (!fs.existsSync(this.nodeModulesPath)) {
      fs.mkdirSync(this.nodeModulesPath, { recursive: true });
    }

    // Install resolved packages
    const spinner = ora('Installing packages').start();
    
    for (const [key, info] of Object.entries(resolved)) {
      const pkgPath = path.join(this.nodeModulesPath, info.name);
      
      if (!fs.existsSync(pkgPath)) {
        fs.mkdirSync(pkgPath, { recursive: true });
      }

      // Write package.json for the installed package
      const pkgInfo = this.getPackageInfo(info.name);
      fs.writeFileSync(
        path.join(pkgPath, 'package.json'),
        JSON.stringify(pkgInfo, null, 2)
      );

      // Create a simple index.js
      fs.writeFileSync(
        path.join(pkgPath, 'index.js'),
        `// ${info.name}@${info.version}\nmodule.exports = { name: '${info.name}', version: '${info.version}' };\n`
      );
    }

    spinner.succeed('Packages installed');

    // Update package.json
    if (packages.length > 0) {
      const depType = saveDev ? 'devDependencies' : 'dependencies';
      
      if (!packageJson[depType]) {
        packageJson[depType] = {};
      }

      for (const pkg of packages) {
        const [name, version] = pkg.split('@');
        const info = this.getPackageInfo(name, version || 'latest');
        packageJson[depType][name] = `^${info.version}`;
      }

      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(chalk.green(`✓ Updated package.json`));
    }

    // Generate lock file
    const lockData = {
      name: packageJson.name,
      version: packageJson.version,
      lockfileVersion: 1,
      dependencies: {}
    };

    for (const [key, info] of Object.entries(resolved)) {
      lockData.dependencies[info.name] = {
        version: info.version,
        dependencies: info.dependencies
      };
    }

    this.writeLockFile(lockData);
    console.log(chalk.green(`✓ Generated mini-pkg-lock.json`));
  }

  // Install from package.json
  async installFromPackageJson() {
    const packageJson = this.readPackageJson();
    const packages = [];

    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        packages.push(`${name}@${version}`);
      }
    }

    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        packages.push(`${name}@${version}`);
      }
    }

    if (packages.length === 0) {
      console.log(chalk.yellow('No dependencies found in package.json'));
      return;
    }

    await this.install(packages, false);
  }

  // Uninstall packages
  async uninstall(packages) {
    const packageJson = this.readPackageJson();

    for (const packageName of packages) {
      const pkgPath = path.join(this.nodeModulesPath, packageName);
      
      if (fs.existsSync(pkgPath)) {
        fs.rmSync(pkgPath, { recursive: true, force: true });
        console.log(chalk.green(`✓ Removed ${packageName}`));
      }

      // Remove from package.json
      if (packageJson.dependencies && packageJson.dependencies[packageName]) {
        delete packageJson.dependencies[packageName];
      }
      if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
        delete packageJson.devDependencies[packageName];
      }
    }

    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(chalk.green(`✓ Updated package.json`));

    // Update lock file
    const lockFile = this.readLockFile();
    if (lockFile) {
      for (const packageName of packages) {
        delete lockFile.dependencies[packageName];
      }
      this.writeLockFile(lockFile);
      console.log(chalk.green(`✓ Updated mini-pkg-lock.json`));
    }
  }

  // List installed packages
  listInstalled() {
    if (!fs.existsSync(this.nodeModulesPath)) {
      return [];
    }

    const packages = fs.readdirSync(this.nodeModulesPath);
    return packages.map(name => {
      const pkgJsonPath = path.join(this.nodeModulesPath, name, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        return { name: pkgJson.name, version: pkgJson.version };
      }
      return { name, version: 'unknown' };
    });
  }

  // Clean
  clean() {
    if (fs.existsSync(this.nodeModulesPath)) {
      fs.rmSync(this.nodeModulesPath, { recursive: true, force: true });
      console.log(chalk.yellow('Removed node_modules/'));
    }

    if (fs.existsSync(this.lockFilePath)) {
      fs.unlinkSync(this.lockFilePath);
      console.log(chalk.yellow('Removed mini-pkg-lock.json'));
    }
  }
}

module.exports = PackageManager;
