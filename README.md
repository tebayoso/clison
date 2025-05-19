# Clison

LLM-friendly CLI tool for processing JSON with JavaScript-like accessors.

## Installation

```bash
npm install -g clison
```

Or for development:
```bash
npm install
npm link
```

## Usage

```bash
# Display JSON
clison data.json

# Use JavaScript accessors
clison data.json 'users.map(u => u.name)'

# Search for keys or values
clison data.json --search email

# List all nodes
clison data.json --list

# LLM-friendly output
clison data.json --llm 'users.filter(u => u.active)'
```

## Features

- JavaScript-like accessor syntax
- Search functionality
- List all nodes with paths
- Replace values at specific paths
- LLM-friendly output mode

## License

MIT