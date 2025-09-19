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

export interface TokenMetadata {
  token_id: string;
  name: string;
  symbol: string;
}

export interface RawTransferRecord {
  from: string;
  encryptedData: string;
  timestamp: number;
  status: "pending" | "finalized" | "failed";
  transferId: string;
}

export interface SaveTransferRecord {
  from: string;
  timestamp: number;
  status: "pending" | "finalized" | "failed";
  transferId: string;
  encryptedData?: string;
}

export interface TransferHistoryRecord {
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: "pending" | "finalized" | "failed";
  transferId: string;
}
