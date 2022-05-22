import { task, types } from 'hardhat/config';
import { Contract, constants, utils, BigNumber } from 'ethers';

import { abi as NFTAbi } from '../abis/NFT.json';

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { TaskArguments } from 'hardhat/types';
import type { BigNumberish, BytesLike, Signer } from 'ethers';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';

interface SignatureMintPayload {
  to: string;
  uri: string;
  price: BigNumberish;
  paymentReceiver: string;
  currencyAddress: string; // TODO: Add support later in the codebase.
}

type SignatureMintPayloadWithTokenId = SignatureMintPayload & {
  tokenId: BigNumberish;
};

const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const SignatureMintVoucher = [
  { name: 'tokenId', type: 'uint256' },
  { name: 'to', type: 'address' },
  {
    name: 'uri',
    type: 'string'
  },
  {
    name: 'price',
    type: 'uint256'
  },
  {
    name: 'currency',
    type: 'address'
  },
  {
    name: 'paymentReceiver',
    type: 'address'
  }
];

// Utility functions
const initializeContract = (address: string, signer: Signer) => {
  return new Contract(address, NFTAbi, signer);
};

const getRoleHash = (role: string = ''): BytesLike => {
  if (role === '') {
    return utils.hexZeroPad([0], 32);
  }

  return utils.id(role);
};

const signTypedData = async (
  signer: Signer,
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  },
  types: any,
  message: any
): Promise<BytesLike> => {
  const provider = signer.provider as JsonRpcProvider;

  if (!provider) {
    throw new Error('No provider is available');
  }

  return await (signer as JsonRpcSigner)._signTypedData(domain, types, message);
};

const payloadToMintStruct = (payload: SignatureMintPayloadWithTokenId) => {
  const parsedPrice = utils.parseEther(payload.price.toString());

  return {
    tokenId: payload.tokenId,
    to: payload.to,
    uri: payload.uri,
    price: parsedPrice,
    currency: payload.currencyAddress,
    paymentReceiver: payload.paymentReceiver
  };
};

// Tasks
task('nft:add-minter')
  .addParam('contract', 'The address of the NFT contract')
  .addParam('address', 'Whom to assign the minter role')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    const nftContract = initializeContract(taskArguments.contract, signers[0]);

    const minterRoleHash = getRoleHash('MINTER_ROLE');

    const tx = await nftContract.functions['grantRole'](
      minterRoleHash,
      taskArguments.address
    );

    const receipt = await tx.wait();

    console.log('Tx hash:', receipt.transactionHash);
  });

task('nft:generate-signature')
  .addParam('contract', 'The address of the NFT contract')
  .addParam('metadata', 'The Metadata for the NFT')
  .addParam('paymentreceiver', 'Who receives the payment for the NFT')
  .addParam(
    'to',
    'The address to which the NFT will be sent',
    constants.AddressZero
  )
  .addParam('price', 'The price for the NFT', 0, types.int)
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();
    const currentSigner = signers[0];

    const provider = currentSigner.provider as JsonRpcProvider;
    const { chainId } = await provider.getNetwork();

    const nftContract = initializeContract(
      taskArguments.contract,
      currentSigner
    );

    // Check if the signer has the `MINTER_ROLE`
    const minterRoleHash = getRoleHash('MINTER_ROLE');
    const minterCount = await nftContract.getRoleMemberCount(minterRoleHash);

    const members = await Promise.all(
      Array.from(Array(minterCount).keys()).map(i =>
        nftContract.getRoleMember(minterRoleHash, i)
      )
    );

    if (!members.includes(currentSigner.address)) {
      throw new Error(
        `The signer ${currentSigner.address} does not have the MINTER_ROLE`
      );
    }

    const nextTokenId = await nftContract.nextTokenId();

    // Construct the payload
    const constructedPayload: SignatureMintPayloadWithTokenId = {
      to: taskArguments.to,
      uri: taskArguments.metadata,
      price: taskArguments.price,
      paymentReceiver: taskArguments.paymentreceiver,
      tokenId: nextTokenId,
      currencyAddress: NATIVE_TOKEN_ADDRESS
    };

    const signature = await signTypedData(
      currentSigner,
      {
        name: 'SignatureMintNFT',
        version: '1',
        chainId,
        verifyingContract: nftContract.address
      },
      { MintVoucher: SignatureMintVoucher },
      payloadToMintStruct(constructedPayload)
    );

    console.log(
      JSON.stringify(
        JSON.stringify({
          payload: constructedPayload,
          signature: signature.toString()
        })
      )
    );
  });

task('nft:verify-signature')
  .addParam('contract', 'The address of the NFT contract')
  .addParam(
    'signedpayload',
    'The stringified payload and signature emitted by the `nft:generate-signature` task'
  )
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();
    const currentSigner = signers[0];

    const nftContract = initializeContract(
      taskArguments.contract,
      currentSigner
    );

    const payloadWithSignature = JSON.parse(taskArguments.signedpayload);

    const message = payloadToMintStruct(payloadWithSignature.payload);

    const [success] = await nftContract.verify(
      message,
      payloadWithSignature.signature
    );

    console.log('Verification success', success);
  });

task('nft:signature-mint')
  .addParam('contract', 'The address of the NFT contract')
  .addParam(
    'signedpayload',
    'The stringified payload and signature emitted by the `nft:generate-signature` task'
  )
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners();
    const currentSigner = signers[0];

    const nftContract = initializeContract(
      taskArguments.contract,
      currentSigner
    );

    const payloadWithSignature = JSON.parse(taskArguments.signedpayload);

    const payload = payloadWithSignature.payload;
    const sign = payloadWithSignature.signature;

    const message = payloadToMintStruct(payload);

    const tx = await nftContract.functions['signatureMint'](message, sign, {
      value: BigNumber.from(message.price)
    });

    const receipt = await tx.wait();

    console.log('Tx hash:', receipt.transactionHash);
  });
