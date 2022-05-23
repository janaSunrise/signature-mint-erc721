import type { BigNumberish } from 'ethers';

export interface SignatureMintPayload {
  to: string;
  uri: string;
  price: BigNumberish;
  paymentReceiver: string;
  currencyAddress: string; // TODO: Add support later in the codebase.
}

export type SignatureMintPayloadWithTokenId = SignatureMintPayload & {
  tokenId: BigNumberish;
};

export interface PayloadWithSign {
  payload: SignatureMintPayloadWithTokenId;
  signature: string;
}
