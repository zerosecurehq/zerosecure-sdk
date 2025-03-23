import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export interface BaseRecord {
  id: string;
  spent: boolean;
  recordName: string;
  name: string;
  owner: string;
  program_id: string;
  status?: string;
}

export interface TransactionOptions {
  feePrivate?: boolean;
  waitToBeConfirmed?: boolean;
  network?: WalletAdapterNetwork;
}
