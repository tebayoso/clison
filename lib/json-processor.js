const _ = require('lodash');
const chalk = require('chalk').default || require('chalk');
const vm = require('vm');

class JSONProcessor {
  constructor(data, llmMode = false) {
    this.data = data;
    this.llmMode = llmMode;
  }

  evaluate(accessor) {
    try {
      // Create a safe context with lodash available
      const context = {
        _,
        data: this.data,
        result: null
      };

      // Prepare the accessor to work on the data
      let code = `result = data`;
      
      // If the accessor doesn't start with a dot, add one
      if (!accessor.startsWith('.') && !accessor.startsWith('[')) {
        accessor = '.' + accessor;
      }
      
      code += accessor;

      // Run in a sandboxed environment
      vm.createContext(context);
      vm.runInContext(code, context);
      
      return context.result;
    } catch (error) {
      throw new Error(`Failed to evaluate accessor: ${error.message}`);
    }
  }

  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    const traverse = (obj, path = '') => {
      if (_.isObject(obj)) {
        _.forEach(obj, (value, key) => {
          const currentPath = path ? `${path}.${key}` : key;
          const keyStr = String(key);
          
          // Check if key matches query
          if (keyStr.toLowerCase().includes(lowerQuery)) {
            results.push({
              path: currentPath,
              key: key,
              value: value,
              matchType: 'key'
            });
          }
          
          // Check if value matches query (for strings)
          if (_.isString(value) && value.toLowerCase().includes(lowerQuery)) {
            results.push({
              path: currentPath,
              key: key,
              value: value,
              matchType: 'value'
            });
          }
          
          // Recurse into nested objects
          traverse(value, currentPath);
        });
      }
    };

    traverse(this.data);
    return results;
  }

  replace(path, newValue) {
    try {
      // Parse the new value
      let parsedValue;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        parsedValue = newValue; // Use as string if not valid JSON
      }

      // Create a copy of the data
      const newData = _.cloneDeep(this.data);
      
      // Use lodash set to update the value
      _.set(newData, path, parsedValue);
      
      return {
        original: _.get(this.data, path),
        new: parsedValue,
        path: path,
        data: newData
      };
    } catch (error) {
      throw new Error(`Failed to replace value: ${error.message}`);
    }
  }

  listAllNodes() {
    const nodes = [];

    const traverse = (obj, path = '') => {
      if (_.isObject(obj)) {
        _.forEach(obj, (value, key) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          nodes.push({
            path: currentPath,
            type: _.isArray(value) ? 'array' : _.isObject(value) ? 'object' : typeof value,
            value: _.isObject(value) ? `${_.isArray(value) ? 'Array' : 'Object'}[${_.size(value)}]` : value
          });
          
          // Recurse into nested objects
          if (_.isObject(value)) {
            traverse(value, currentPath);
          }
        });
      }
    };

    traverse(this.data);
    return nodes;
  }

  outputResults(result, operation, params = null) {
    if (this.llmMode) {
      this.outputLLMFormat(result, operation, params);
    } else {
      this.outputHumanFormat(result, operation, params);
    }
  }

  outputHumanFormat(result, operation, params) {
    console.log(chalk.cyan(`\n=== ${operation.toUpperCase()} ===\n`));

    switch (operation) {
      case 'search':
        if (result.length === 0) {
          console.log(chalk.yellow('No matches found'));
        } else {
          result.forEach(item => {
            console.log(chalk.green(`Path: ${item.path}`));
            console.log(chalk.gray(`Type: ${item.matchType}`));
            console.log(`Value: ${JSON.stringify(item.value, null, 2)}`);
            console.log('---');
          });
        }
        break;

      case 'replace':
        console.log(chalk.green(`Path: ${result.path}`));
        console.log(chalk.red(`Original: ${JSON.stringify(result.original, null, 2)}`));
        console.log(chalk.green(`New: ${JSON.stringify(result.new, null, 2)}`));
        console.log(chalk.cyan('\nUpdated JSON:'));
        console.log(JSON.stringify(result.data, null, 2));
        break;

      case 'list':
        result.forEach(node => {
          const typeColor = node.type === 'object' ? chalk.blue :
                          node.type === 'array' ? chalk.magenta :
                          node.type === 'string' ? chalk.green :
                          node.type === 'number' ? chalk.yellow :
                          chalk.white;
          
          console.log(`${chalk.cyan(node.path)} ${typeColor(`[${node.type}]`)} ${node.value}`);
        });
        break;

      case 'evaluate':
        console.log(chalk.green(`Expression: ${params}`));
        console.log(chalk.cyan('Result:'));
        console.log(JSON.stringify(result, null, 2));
        break;

      default:
        console.log(JSON.stringify(result, null, 2));
    }
  }

  outputLLMFormat(result, operation, params) {
    const output = {
      operation,
      params,
      result,
      instructions: this.getLLMInstructions(operation),
      usage_examples: this.getUsageExamples(operation)
    };

    console.log(JSON.stringify(output, null, 2));
  }

  getLLMInstructions(operation) {
    const instructions = {
      search: "The search operation returns an array of matches. Each match contains 'path' (dot notation), 'key', 'value', and 'matchType' (either 'key' or 'value').",
      replace: "The replace operation returns an object with 'original' value, 'new' value, 'path', and the complete updated 'data'. The entire JSON structure is modified.",
      list: "The list operation returns all nodes in the JSON structure with their paths, types, and values. Objects and arrays show their size instead of content.",
      evaluate: "The evaluate operation executes JavaScript-like expressions on the JSON data. It supports method chaining and lodash functions.",
      display: "The display operation shows the entire JSON structure."
    };

    return instructions[operation] || "Process JSON data according to the operation.";
  }

  getUsageExamples(operation) {
    const examples = {
      search: [
        "clison data.json --search user",
        "clison data.json --search email"
      ],
      replace: [
        "clison data.json --replace 'user.name' '\"John Doe\"'",
        "clison data.json --replace 'settings.theme' '\"dark\"'"
      ],
      list: [
        "clison data.json --list"
      ],
      evaluate: [
        "clison data.json 'users.map(u => u.name)'",
        "clison data.json 'settings.theme'",
        "clison data.json '_.filter(users, {active: true})'"
      ],
      display: [
        "clison data.json"
      ]
    };

    return examples[operation] || [];
  }
}

module.exports = JSONProcessor;