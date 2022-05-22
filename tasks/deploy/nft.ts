import { task } from 'hardhat/config';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { TaskArguments } from 'hardhat/types';

task('deploy:NFT')
  .addParam('name', 'Name for the NFT contract')
  .addParam('symbol', 'Symbol to be used for the ERC721 token')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const nftFactory = await ethers.getContractFactory('NFT');
    const nft = await nftFactory
      .connect(signers[0])
      .deploy(taskArguments.name, taskArguments.symbol);

    await nft.deployed();

    console.log('NFT contract deployed to: ', nft.address);
  });
