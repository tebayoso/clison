#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk').default || require('chalk');
const fs = require('fs');
const path = require('path');
const JSONProcessor = require('../lib/json-processor');

program
  .version('0.1.0')
  .description('LLM-friendly CLI tool for processing JSON with JavaScript-like accessors')
  .argument('<file>', 'JSON file to process')
  .argument('[accessor]', 'JavaScript-like accessor expression')
  .option('-s, --search <query>', 'Search for keys or values in JSON')
  .option('-r, --replace <path> <value>', 'Replace value at path')
  .option('-l, --list', 'List all nodes and their paths')
  .option('--llm', 'Output in LLM-friendly format with instructions')
  .action((file, accessor, options) => {
    try {
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