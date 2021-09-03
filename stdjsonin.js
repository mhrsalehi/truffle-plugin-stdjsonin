const cliLogger = require("cli-logger");
const fs = require("fs");
const path = require("path");
const { enforce, enforceOrThrow, normaliseContractPath } = require("./util");
const { version } = require("./package.json");

const logger = cliLogger({ level: "info" });

module.exports = async (config) => {
  // Set debug logging
  if (config.debug) logger.level("debug");
  logger.debug("DEBUG logging is turned ON");
  logger.debug(`Running truffle-plugin-stdjsonin v${version}`);

  const options = parseConfig(config);
  const contractNameAddressPairs = config._.slice(1);

  for (const contractNameAddressPair of contractNameAddressPairs) {
    logger.info(`Generating Standard JSON Input ${contractNameAddressPair}`);
    try {
      const contractName = contractNameAddressPair.split("@")[0];
      const artifact = getArtifact(contractName, options);
      const inputJSON = getInputJSON(artifact, options);
      fs.writeFileSync(`${contractName}-input.json`, JSON.stringify(inputJSON));
      console.log(
        `Standard JSON Input for ${contractName} saved in ${contractName}-input.json`
      );
      console.log('trying to compile and check with generated Standard JSON Input...')
      tryCompileAndMatch(artifact, inputJSON, contractName)
    } catch (error) {
      logger.error(error.message);
    }
    logger.info();
  }
};

const parseConfig = (config) => {
  enforce(config._.length > 1, "No contract name(s) specified", logger);

  const workingDir = config.working_directory;
  const contractsBuildDir = config.contracts_build_directory;
  const contractsDir = config.contracts_directory;

  let forceConstructorArgsType, forceConstructorArgs;
  if (config.forceConstructorArgs) {
    [forceConstructorArgsType, forceConstructorArgs] =
      config.forceConstructorArgs.split(":");
    enforce(
      forceConstructorArgsType === "string",
      "Force constructor args must be string type",
      logger
    );
    logger.debug(`Force custructor args provided: 0x${forceConstructorArgs}`);
  }

  return {
    workingDir,
    contractsBuildDir,
    contractsDir,
    forceConstructorArgs,
  };
};

const getArtifact = (contractName, options) => {
  const artifactPath = path.resolve(
    options.contractsBuildDir,
    `${contractName}.json`
  );
  logger.debug(`Reading artifact file at ${artifactPath}`);
  enforceOrThrow(
    fs.existsSync(artifactPath),
    `Could not find ${contractName} artifact at ${artifactPath}`
  );
  // Stringify + parse to make a deep copy (to avoid bugs with PR #19)
  return JSON.parse(JSON.stringify(require(artifactPath)));
};

const getInputJSON = (artifact, options) => {
  const metadata = JSON.parse(artifact.metadata);
  // const libraries = getLibraries(artifact, options)

  const sources = {};
  for (const contractPath in metadata.sources) {
    // If we're on Windows we need to de-Unixify the path so that Windows can read the file
    // We also need to replace the 'project:' prefix so that the file can be read
    const normalisedContractPath = normaliseContractPath(
      contractPath,
      options.contractsDir
    );
    const absolutePath = require.resolve(normalisedContractPath);
    const content = fs.readFileSync(absolutePath, "utf8");

    // Remove the 'project:' prefix that was added in Truffle v5.3.14
    const relativeContractPath = contractPath;

    sources[relativeContractPath] = { content };
  }

  const inputJSON = {
    language: metadata.language,
    sources,
    settings: {
      remappings: metadata.settings.remappings,
      optimizer: metadata.settings.optimizer,
      evmVersion: metadata.settings.evmVersion,
    },
  };

  return inputJSON;
};

const tryCompileAndMatch = (artifact, jsonInput, contractName) => {
  const solc = require("solc");
  const i = JSON.stringify(jsonInput);
  const iObj = JSON.parse(i);
  iObj.settings.outputSelection = { "*": { "*": ["*", "*"] } };
  const o = solc.compile(JSON.stringify(iObj));
  const oObj = JSON.parse(o);
  const metadataOld = artifact.metadata;
  const metadataOldObj = JSON.parse(metadataOld);

  const path = Object.keys(metadataOldObj.settings.compilationTarget)[0]
  const metadataNew = oObj.contracts[path][metadataOldObj.settings.compilationTarget[path]].metadata

  const bytecodeNew = oObj.contracts[path][metadataOldObj.settings.compilationTarget[path]].evm.bytecode.object.replace("0x", "");
  const bytecodeOld = artifact.bytecode.replace("0x", "");

  if (metadataOld === metadataNew) {
    console.log("\u2713 metadata matches EXACTLY!");
  }else{
    console.log('ERROR: metadata does not match')
  }

  if (bytecodeOld === bytecodeNew) {
    console.log("\u2713 bytecode matches EXACTLY!");
  }else{
    console.log('ERROR: bytecode does not match')
  }
};
