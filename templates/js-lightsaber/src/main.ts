import chalk from 'chalk';

async function main() {
  console.log(chalk.green('JavaScript Lightsaber initialized!'));
  console.log('Hello, World!');
}

main().catch(console.error);
