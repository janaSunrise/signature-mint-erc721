import { Contract, utils } from 'ethers';

import { abi as NFTAbi } from '../../abis/NFT.json';

import type {
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractFunction,
  Signer
} from 'ethers';
import type {
  JsonRpcProvider,
  JsonRpcSigner,
  TransactionReceipt
} from '@ethersproject/providers';
import type { SignatureMintPayloadWithTokenId, PayloadWithSign } from './types';

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

export class LazyMinter {
  public contract: Contract;
  public signer: Signer;

  constructor(address: string, signer: Signer) {
    this.contract = new Contract(address, NFTAbi, signer);
    this.signer = signer;
  }

  // Utility functions
  public getRoleHash(role: string = ''): BytesLike {
    if (role === '') {
      return utils.hexZeroPad([0], 32);
    }

    return utils.id(role);
  }

  public async getChainId(): Promise<number> {
    const provider = this.signer.provider;

    if (!provider) {
      throw new Error('No provider is available');
    }

    const { chainId } = await provider.getNetwork();
    return chainId;
  }

  public async sendTransaction(
    func: string,
    args: any[],
    callOverrides?: CallOverrides
  ): Promise<TransactionReceipt> {
    if (!callOverrides) {
      callOverrides = {};
    }

    const fn: ContractFunction = this.contract.functions[func];

    if (!func) {
      throw new Error('Invalid function.');
    }

    const tx = await fn(...args, callOverrides);

    return await tx.wait();
  }

  public async signTypedData(
    signer: Signer,
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: string;
    },
    types: any,
    message: any
  ): Promise<BytesLike> {
    const provider = signer.provider as JsonRpcProvider;

    if (!provider) {
      throw new Error('No provider is available');
    }

    return await (signer as JsonRpcSigner)._signTypedData(
      domain,
      types,
      message
    );
  }

  public payloadToMintStruct(payload: SignatureMintPayloadWithTokenId) {
    const parsedPrice = utils.parseEther(payload.price.toString());

    return {
      tokenId: payload.tokenId,
      to: payload.to,
      uri: payload.uri,
      price: parsedPrice,
      currency: payload.currencyAddress,
      paymentReceiver: payload.paymentReceiver
    };
  }

  // Contract functions
  public async nextTokenId(): Promise<number> {
    return await this.contract.nextTokenId();
  }

  public async getAllRoleMembers(role: string): Promise<string[]> {
    const roleHash = this.getRoleHash(role);
    const memberCount = await this.contract.getRoleMemberCount(roleHash);

    return await Promise.all(
      Array.from(Array(memberCount).keys()).map(i =>
        this.contract.getRoleMember(roleHash, i)
      )
    );
  }

  public async grantRole(role: string, address: string) {
    const roleHash = this.getRoleHash(role);

    return await this.sendTransaction('grantRole', [roleHash, address]);
  }

  public async generateSignature(payload: {
    to: string;
    metadata: string;
    price: BigNumberish;
    paymentreceiver: string;
  }) {
    const chainId = await this.getChainId();
    const nextTokenId = await this.nextTokenId();

    const minterMembers = await this.getAllRoleMembers('MINTER_ROLE');

    if (!minterMembers.includes(await this.signer.getAddress())) {
      throw new Error('Only minters can mint');
    }

    const constructedPayload: SignatureMintPayloadWithTokenId = {
      to: payload.to,
      uri: payload.metadata,
      price: payload.price,
      paymentReceiver: payload.paymentreceiver,
      tokenId: nextTokenId,
      currencyAddress: NATIVE_TOKEN_ADDRESS
    };

    const signature = await this.signTypedData(
      this.signer,
      {
        name: 'SignatureMintNFT',
        version: '1',
        chainId,
        verifyingContract: this.contract.address
      },
      { MintVoucher: SignatureMintVoucher },
      this.payloadToMintStruct(constructedPayload)
    );

    return {
      payload: constructedPayload,
      signature: signature.toString()
    };
  }

  public async verifySignature(
    payloadWithSignature: PayloadWithSign
  ): Promise<boolean> {
    const message = this.payloadToMintStruct(
      payloadWithSignature.payload
    );

    const [success] = await this.contract.verify(
      message,
      payloadWithSignature.signature
    );

    return success;
  }

  public async signatureMint(payloadWithSignature: PayloadWithSign) {
    const payload = payloadWithSignature.payload;
    const sign = payloadWithSignature.signature;

    const message = this.payloadToMintStruct(payload);

    return await this.sendTransaction('signatureMint', [message, sign], {
      value: message.price
    });
  }
}
