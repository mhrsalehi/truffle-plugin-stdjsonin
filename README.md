# truffle-plugin-stdjsonin
  
A [Truffle](https://trufflesuite.com/index.html) plugin for generating a flat Solidity Json Input file.

The [Solidity Json Input](https://docs.soliditylang.org/en/v0.8.10/using-the-compiler.html#compiler-input-and-output-json-description) format is preferred over [flattening](https://www.npmjs.com/package/truffle-flattener) your files during verification on Etherscan as it :
- preserves code formatting
- maintains multipart files
- embeds compiler settings, including optimization and bytecodehash

## Installation
1. Install the plugin using npm 
  ```
  npm install -D https://github.com/mhrsalehi/truffle-plugin-stdjsonin/
  ```
2. Add the plugin to your `truffle-config.js` file
  ```javascript
  module.exports = {
    /* ... rest of truffle-config */

    plugins: [
     'truffle-plugin-stdjsonin'
    ]
  }
  ```
## Usage
1. Run the plugin on your specified contract name 
  ```
  truffle run stdjsonin ContractName
  ```
  A `ContractName-Input.json` file is generated in your project directory. 
