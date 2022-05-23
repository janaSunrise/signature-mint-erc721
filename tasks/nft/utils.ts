import { Contract, utils } from 'ethers';

import { abi as NFTAbi } from '../../abis/NFT.json';

import type { BytesLike, Signer } from 'ethers';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { SignatureMintPayloadWithTokenId } from './types';

export const NATIVE_TOKEN_ADDRESS =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const SignatureMintVoucher = [
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
export const initializeContract = (address: string, signer: Signer) => {
  return new Contract(address, NFTAbi, signer);
};

export const getRoleHash = (role: string = ''): BytesLike => {
  if (role === '') {
    return utils.hexZeroPad([0], 32);
  }

  return utils.id(role);
};

export const signTypedData = async (
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

export const payloadToMintStruct = (
  payload: SignatureMintPayloadWithTokenId
) => {
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
