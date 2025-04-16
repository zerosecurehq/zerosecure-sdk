import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState } from "react";
import {
  BaseRecord,
  filterOutdatedWalletRecord,
  TransactionOptions,
  WALLET_MANAGER_PROGRAM_ID,
} from "./utils";
import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export interface WalletRecordData {
  wallet_address: string;
  owners: string[];
  threshold: string; // u8
  sequence: string; // u64
}

export interface WalletRecord extends BaseRecord {
  data: WalletRecordData;
}

export function useGetWalletCreated() {
  let { publicKey, requestRecords } = useWallet();
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState<Error | null>(null);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
    setIsProcessing(false);
  };

  /**
   *
   * @returns all multisig wallets you created or you are part of
   */
  const getWalletCreated = async ({
    network = WalletAdapterNetwork.TestnetBeta,
  }: TransactionOptions = {}) => {
    try {
      if (!publicKey || !requestRecords) {
        return setError(new Error("Wallet not connected"));
      }
      setIsProcessing(true);
      let walletCreated: WalletRecord[] = await requestRecords(
        WALLET_MANAGER_PROGRAM_ID
      );
      let unspentWallets = walletCreated
        .map((wallet) => {
          let recordName = wallet.recordName || wallet.name;
          if (wallet.spent || recordName !== "Wallet") return null;
          if (wallet.status && wallet.status !== "Unspent") return null;
          return wallet;
        })
        .filter((wallet) => wallet !== null);
      let finalWallets = await filterOutdatedWalletRecord(
        network,
        unspentWallets
      );
      setIsProcessing(false);
      return finalWallets as WalletRecord[];
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { getWalletCreated, isProcessing, error, reset };
}
