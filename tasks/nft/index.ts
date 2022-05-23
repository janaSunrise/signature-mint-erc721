import { task, types } from 'hardhat/config';
import { constants } from 'ethers';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { TaskArguments } from 'hardhat/types';

import { LazyMinter } from './utils';

task('nft:add-minter')
  .addParam('contract', 'The address of the NFT contract')
  .addParam('address', 'Whom to assign the minter role')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const lazyMinter = new LazyMinter(taskArguments.contract, signers[0]);

    const receipt = await lazyMinter.grantRole(
      'MINTER_ROLE',
      taskArguments.address
    );

    console.log(`Transaction hash: ${receipt.transactionHash}`);
  });

task('nft:generate-signature')
  .addParam('contract', 'The address of the NFT contract')
  .addParam('metadata', 'The URI containing metadata for the NFT')
  .addParam('paymentreceiver', 'Who receives the payment for the NFT')
  .addParam(
    'to',
    'The address to which the NFT will be sent',
    constants.AddressZero
  )
  .addParam('price', 'The price for the NFT', 0, types.int)
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const lazyMinter = new LazyMinter(taskArguments.contract, signers[0]);

    const payloadWithSign = await lazyMinter.generateSignature({
      to: taskArguments.to,
      metadata: taskArguments.metadata,
      price: taskArguments.price,
      paymentreceiver: taskArguments.paymentreceiver
    });

    console.log(JSON.stringify(JSON.stringify(payloadWithSign)));
  });

task('nft:verify-signature')
  .addParam('contract', 'The address of the NFT contract')
  .addParam(
    'signedpayload',
    'The stringified payload and signature emitted by the `nft:generate-signature` task'
  )
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const lazyMinter = new LazyMinter(taskArguments.contract, signers[0]);

    const payloadWithSignature = JSON.parse(taskArguments.signedpayload);

    const success = await lazyMinter.verifySignature(payloadWithSignature);

    console.log(`Signature verified status: ${success}`);
  });

task('nft:signature-mint')
  .addParam('contract', 'The address of the NFT contract')
  .addParam(
    'signedpayload',
    'The stringified payload and signature emitted by the `nft:generate-signature` task'
  )
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const lazyMinter = new LazyMinter(taskArguments.contract, signers[0]);

    const payloadWithSignature = JSON.parse(taskArguments.signedpayload);

    const receipt = await lazyMinter.signatureMint(payloadWithSignature);

    console.log(`Transaction hash: ${receipt.transactionHash}`);
  });
