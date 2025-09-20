import { useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { useZeroWallet } from "./context/ZeroSecureContext";
import { WalletRecord } from "./useGetWalletCreated";
import {
  getTransfers,
  decryptExecuteTransaction,
  TransferHistoryRecord,
  RawTransferRecord,
} from "./utils";

interface TransactionOptions {
  network?: WalletAdapterNetwork;
  walletRecord?: WalletRecord;
}

export function useTransferHistory({
  network = WalletAdapterNetwork.TestnetBeta,
  walletRecord,
}: TransactionOptions = {}) {
  const { publicKey } = useZeroWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<TransferHistoryRecord[]>([]);

  const reset = () => {
    setError(null);
    setIsLoading(false);
  };

  const fetchTransferHistory = async () => {
    if (!publicKey) {
      return setError(new Error("Wallet not connected"));
    }
    if (!walletRecord) {
      return setError(new Error("Wallet record is required for decryption"));
    }

    setIsLoading(true);
    try {
      const rawHistory: RawTransferRecord[] = await getTransfers(
        publicKey,
        network
      );

      const fullHistory: TransferHistoryRecord[] = rawHistory.map((raw) => {
        const decrypted = decryptExecuteTransaction(
          walletRecord,
          raw.encryptedData
        );
        return {
          from: raw.from,
          to: decrypted.to,
          amount: decrypted.amount,
          timestamp: raw.timestamp,
          status: raw.status,
          transferId: raw.transferId,
        };
      });

      setHistory(fullHistory);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setError(error as Error);
    }
  };

  useEffect(() => {
    if (publicKey && walletRecord) {
      fetchTransferHistory();
    }
  }, [publicKey, walletRecord]);

  return {
    history,
    isLoading,
    error,
    reset,
    fetchTransferHistory,
  };
}
