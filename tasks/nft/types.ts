import type { BigNumberish } from 'ethers';

export interface SignatureMintPayload {
  to: string;
  uri: string;
  price: BigNumberish;
  paymentReceiver: string;
  currencyAddress: string; // TODO: Add support later in the codebase.
}

export type SignatureMintPayloadWithUUID = SignatureMintPayload & {
  uuid: string;
};

export interface PayloadWithSign {
  payload: SignatureMintPayloadWithUUID;
  signature: string;
}
