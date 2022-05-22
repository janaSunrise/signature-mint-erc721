import { task } from 'hardhat/config';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { TaskArguments } from 'hardhat/types';

task('deploy:Greeter')
  .addParam('greeting', 'Say hello, be nice')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const greeterFactory = await ethers.getContractFactory('Greeter');
    const greeter = await greeterFactory
      .connect(signers[0])
      .deploy(taskArguments.greeting);

    await greeter.deployed();

    console.log('Greeter deployed to: ', greeter.address);
  });
