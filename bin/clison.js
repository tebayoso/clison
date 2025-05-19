#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk').default || require('chalk');
const fs = require('fs');
const path = require('path');
const JSONProcessor = require('../lib/json-processor');

function showComprehensiveHelp() {
  console.log(`
${chalk.blue.bold('CLISON - LLM-Friendly JSON Processing Tool')}

${chalk.yellow('USAGE:')}
  clison <file> [accessor] [options]

${chalk.yellow('DESCRIPTION:')}
  Clison is a powerful JSON processing tool that uses JavaScript syntax for data
  manipulation. It's designed to be more intuitive than jq while providing
  comprehensive error handling and LLM-friendly output formats.

${chalk.yellow('BASIC USAGE:')}
  ${chalk.gray('# Display JSON file content')}
  clison data.json

  ${chalk.gray('# Access nested properties')}
  clison data.json 'users[0].name'

  ${chalk.gray('# Filter and map data')}
  clison data.json 'users.filter(u => u.active).map(u => u.email)'

  ${chalk.gray('# Search for keys or values')}
  clison data.json --search email

  ${chalk.gray('# List all nodes and their paths')}
  clison data.json --list

${chalk.yellow('OPTIONS:')}
  ${chalk.green('-s, --search <query>')}    Search for keys or values containing query
  ${chalk.green('-r, --replace <path> <value>')}    Replace value at specific path
  ${chalk.green('-l, --list')}             List all nodes with their paths and types
  ${chalk.green('--llm')}                   Output in LLM-friendly structured format

${chalk.yellow('ACCESSOR SYNTAX:')}
  Accessors use JavaScript syntax to navigate and transform data:

  ${chalk.gray('• Dot notation:')}     data.property
  ${chalk.gray('• Bracket notation:')} data['property'] or data[0]
  ${chalk.gray('• Array methods:')}    data.filter(), data.map(), data.reduce()
  ${chalk.gray('• Object methods:')}   Object.keys(data), Object.values(data)
  ${chalk.gray('• Chaining:')}         data.users.filter(u => u.age > 18).map(u => u.name)

${chalk.yellow('SEARCH OPERATION:')}
  Find keys or values matching a query:
  ${chalk.cyan('clison data.json --search email')}
  
  Returns all paths where keys or values contain "email"

${chalk.yellow('REPLACE OPERATION:')}
  Update values at specific paths:
  ${chalk.cyan('clison data.json --replace "users[0].active" true')}

${chalk.yellow('LIST OPERATION:')}
  View all nodes with their paths and types:
  ${chalk.cyan('clison data.json --list')}
  
  Useful for understanding JSON structure

${chalk.yellow('LLM MODE:')}
  Output structured data with processing instructions:
  ${chalk.cyan('clison data.json --llm "users.filter(u => u.active)"')}
  
  Returns JSON with:
  - Operation performed
  - Parameters used
  - Results
  - Instructions for interpretation
  - Usage examples

${chalk.yellow('EXAMPLES:')}
  ${chalk.gray('# Get all active user emails')}
  clison users.json 'users.filter(u => u.active).map(u => u.email)'

  ${chalk.gray('# Count users by role')}
  clison users.json 'users.reduce((acc, u) => {acc[u.role] = (acc[u.role] || 0) + 1; return acc}, {})'

  ${chalk.gray('# Find all paths containing "admin"')}
  clison config.json --search admin

  ${chalk.gray('# Update a configuration value')}
  clison config.json --replace "database.host" "localhost"

  ${chalk.gray('# Extract nested data with LLM-friendly output')}
  clison api-response.json --llm 'data.results.map(r => ({id: r.id, name: r.name}))'

${chalk.yellow('TIPS:')}
  • Use quotes around accessors containing spaces or special characters
  • Use --llm flag when processing data for AI/LLM consumption
  • Combine filters and transformations for complex queries
  • Check JSON structure with --list before writing accessors

${chalk.blue('For more information, visit: https://github.com/tebayoso/clison')}
`);
}

program
  .version('0.1.0')
  .description('LLM-friendly CLI tool for processing JSON with JavaScript-like accessors')
  .argument('[file]', 'JSON file to process')
  .argument('[accessor]', 'JavaScript-like accessor expression')
  .option('-s, --search <query>', 'Search for keys or values in JSON')
  .option('-r, --replace <path> <value>', 'Replace value at path')
  .option('-l, --list', 'List all nodes and their paths')
  .option('--llm', 'Output in LLM-friendly format with instructions')
  .action((file, accessor, options) => {
    try {
      // Show help if no arguments provided
      if (!file && !accessor && Object.keys(options).length === 0) {
        showComprehensiveHelp();
        process.exit(0);
      }

      if (!file) {
        console.error(chalk.red('Error: No JSON file specified'));
        process.exit(1);
      }

      const filePath = path.resolve(file);
      
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Error: File not found: ${filePath}`));
        process.exit(1);
      }

      const jsonContent = fs.readFileSync(filePath, 'utf8');
      let data;
      
      try {
        data = JSON.parse(jsonContent);
      } catch (e) {
        console.error(chalk.red(`Error: Invalid JSON in file: ${e.message}`));
        process.exit(1);
      }

      const processor = new JSONProcessor(data, options.llm);

      if (options.search) {
        const results = processor.search(options.search);
        processor.outputResults(results, 'search', options.search);
      } else if (options.replace) {
        const [path, value] = options.replace.split(' ');
        const result = processor.replace(path, value);
        processor.outputResults(result, 'replace', { path, value });
      } else if (options.list) {
        const results = processor.listAllNodes();
        processor.outputResults(results, 'list');
      } else if (accessor) {
        const result = processor.evaluate(accessor);
        processor.outputResults(result, 'evaluate', accessor);
      } else {
        processor.outputResults(data, 'display');
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);