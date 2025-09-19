import { useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { useZeroWallet } from "./context/ZeroSecureContext";
import { ExecuteTicketRecord as CustomExecuteTicket } from "./useExecuteTransferTicket";
import { WalletRecord } from "./useGetWalletCreated";
import { ConfirmTransferTicketRecord } from "./useConfirmTransferTicket";
import {
  getTransfers,
  saveTransfer,
  updateTransferStatus,
  encryptExecuteTransaction,
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

  const addTransferToHistory = async (
    transferData: ConfirmTransferTicketRecord | CustomExecuteTicket,
    walletRecord: WalletRecord,
    isInitiator: boolean = false
  ) => {
    if (!publicKey) {
      return setError(new Error("Wallet not connected"));
    }

    setIsLoading(true);
    try {
      const newRecord = {
        from: walletRecord.data.wallet_address,
        timestamp: Date.now(),
        status: "pending" as const,
        transferId: transferData.data.transfer_id,
      };

      let encryptedData: string | undefined;
      if (isInitiator) {
        encryptedData = encryptExecuteTransaction(walletRecord, {
          data: {
            to: transferData.data.to,
            amount: transferData.data.amount,
            wallet_address: walletRecord.data.wallet_address,
            transfer_id: transferData.data.transfer_id,
          },
        } as CustomExecuteTicket);
      }

      await saveTransfer(
        { ...newRecord, encryptedData },
        walletRecord,
        publicKey,
        isInitiator,
        network
      );

      const fullRecord: TransferHistoryRecord = {
        ...newRecord,
        to: transferData.data.to,
        amount: transferData.data.amount,
      };

      const updatedHistory = [fullRecord, ...history];
      setHistory(updatedHistory);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setError(error as Error);
    }
  };

  const updateTransferStatusInHistory = async (
    transferId: string,
    status: "pending" | "finalized" | "failed"
  ) => {
    if (!publicKey) {
      return setError(new Error("Wallet not connected"));
    }

    setIsLoading(true);
    try {
      await updateTransferStatus(transferId, status, publicKey, network);

      const updatedHistory = history.map((record) =>
        record.transferId === transferId ? { ...record, status } : record
      );
      setHistory(updatedHistory);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setError(error as Error);
    }
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
    addTransferToHistory,
    updateTransferStatus: updateTransferStatusInHistory,
    fetchTransferHistory,
  };
}
