import { ethers } from 'hardhat';

const main = async () => {
  const Greeter = await ethers.getContractFactory('Greeter');
  const greeter = await Greeter.deploy('Hello, Hardhat!');

  await greeter.deployed();

  console.log('Greeter deployed to:', greeter.address);
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
