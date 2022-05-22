import fs from 'fs';
import glob from 'glob';

// Function to copy all ABI JSON files generated in artifacts/ to the abi/ directory.
const copyAbis = async (fromPath: string, toPath: string) => {
  // Make the To directory if it doesn't exist.
  if (!fs.existsSync(toPath)) {
    fs.mkdirSync(toPath);
  }

  // Recursively detect all ABI JSON files.
  const abiFiles = glob.sync(`${fromPath}/**/*.json`);

  // Ignore files with .dbg.json
  const abiFilesToCopy = abiFiles.filter(file => !file.includes('.dbg.json'));

  // Copy each ABI JSON file to the To directory.
  for (const abiFile of abiFilesToCopy) {
    fs.copyFileSync(abiFile, `${toPath}/${abiFile.split('/').pop()}`);
  }
};

copyAbis(`${__dirname}/artifacts/contracts`, `${__dirname}/abis`);
