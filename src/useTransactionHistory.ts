import { useState, useEffect } from "react";
import {
  WalletAdapterNetwork,
  AleoTransaction,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  TransactionOptions,
  waitTransactionToBeConfirmedOrError,
  getMappingValue,
  getMappingObjectValue,
  TRANSFER_MANAGER_PROGRAM_ID,
  filterOutExecutedTransferTickets,
  ZEROSECURE_BACKEND_URL,
  encryptExecuteTransaction,
  calcEncryptionKeyFromWalletRecord,
} from "./utils";
import { useZeroWallet } from "./context/ZeroSecureContext";
import { ExecuteTicketRecord as CustomExecuteTicket } from "./useExecuteTransferTicket";
import { WalletRecord } from "./useGetWalletCreated";
import { ConfirmTransferTicketRecord } from "./useConfirmTransferTicket";

interface TransferHistoryRecord {
  transferId: string;
  walletAddress: string;
  status: "Pending" | "Confirmed" | "Executed" | "Failed" | "Rejected";
  confirmations: number;
  threshold: number;
  timestamp: number;
  encryptedData?: string;
  txId?: string;
}

export function useTransferHistory({
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  const { publicKey, transactionStatus } = useZeroWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<TransferHistoryRecord[]>([]);

  const reset = () => {
    setError(null);
    setIsLoading(false);
  };

  const saveToBackendDB = async (
    record: TransferHistoryRecord,
    walletRecord: WalletRecord,
    isInitiator: boolean = false
  ) => {
    try {
      let encryptedData: string | undefined;
      if (isInitiator && record.encryptedData) {
        encryptedData = record.encryptedData;
      }

      const response = await fetch(`${ZEROSECURE_BACKEND_URL}/saveTransfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...record,
          encryptedData,
          publicKey,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save to backend DB");
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const updateStatusInBackendDB = async (
    transferId: string,
    newStatus: "Pending" | "Confirmed" | "Executed" | "Failed" | "Rejected",
    confirmations: number,
    txId?: string
  ) => {
    try {
      const response = await fetch(`${ZEROSECURE_BACKEND_URL}/updateStatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferId,
          status: newStatus,
          confirmations,
          txId,
          publicKey,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update status in backend DB");
      }
    } catch (error) {
      throw error;
    }
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
      let encryptedData: string | undefined;
      if (isInitiator) {
        encryptedData = encryptExecuteTransaction(
          walletRecord,
          transferData as CustomExecuteTicket
        );
      }

      const newRecord: TransferHistoryRecord = {
        transferId: transferData.data.transfer_id,
        walletAddress: transferData.data.wallet_address,
        status: "Pending",
        confirmations: 1,
        threshold: parseInt(walletRecord.data.threshold),
        timestamp: Date.now(),
        encryptedData,
      };

      await saveToBackendDB(newRecord, walletRecord, isInitiator);

      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setError(error as Error);
    }
  };

  const decryptViaBackend = async (
    walletRecord: WalletRecord,
    encryptedData: string
  ) => {
    try {
      const encryptionKey = calcEncryptionKeyFromWalletRecord(walletRecord);
      const response = await fetch(`${ZEROSECURE_BACKEND_URL}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData, encryptionKey }),
      });
      if (!response.ok) {
        throw new Error("Backend decryption failed");
      }
      const decrypted = await response.json();
      return decrypted;
    } catch (error) {
      console.warn("Backend decryption failed:", error);
      throw error;
    }
  };

  const scanAndUpdateStatus = async (
    transferId: string,
    walletRecord: WalletRecord,
    txId?: string
  ) => {
    if (!publicKey) {
      return setError(new Error("Wallet not connected"));
    }

    setIsLoading(true);
    try {
      if (txId && transactionStatus) {
        await waitTransactionToBeConfirmedOrError(txId, transactionStatus);
      }

      let attempts = 0;
      const maxAttempts = 60;
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const result = await getMappingObjectValue<{
          confirmations: number;
          executed: boolean;
        }>(
          network,
          "transfers_status",
          transferId,
          TRANSFER_MANAGER_PROGRAM_ID
        );

        let newStatus: "Pending" | "Confirmed" | "Executed" = result.executed
          ? "Executed"
          : result.confirmations < parseInt(walletRecord.data.threshold)
          ? "Pending"
          : "Confirmed";

        await updateStatusInBackendDB(
          transferId,
          newStatus,
          result.confirmations,
          txId
        );

        const updatedHistory: TransferHistoryRecord[] = history.map((record) =>
          record.transferId === transferId
            ? {
                ...record,
                status: newStatus,
                confirmations: result.confirmations,
                txId,
              }
            : record
        );
        setHistory(updatedHistory);

        if (result.executed) {
          setIsLoading(false);
          return;
        }

        attempts++;
      }

      await updateStatusInBackendDB(transferId, "Failed", 0);
      const updatedHistory: TransferHistoryRecord[] = history.map((record) =>
        record.transferId === transferId
          ? { ...record, status: "Failed" }
          : record
      );
      setHistory(updatedHistory);
      setError(new Error("Scan timeout: Transfer may have failed"));
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      await updateStatusInBackendDB(transferId, "Failed", 0);
      const updatedHistory: TransferHistoryRecord[] = history.map((record) =>
        record.transferId === transferId
          ? { ...record, status: "Failed" }
          : record
      );
      setHistory(updatedHistory);
      setIsLoading(false);
      setError(error as Error);
    }
  };

  const fetchTransferHistory = async (walletRecord?: WalletRecord) => {
    if (!publicKey) {
      return setError(new Error("Wallet not connected"));
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${ZEROSECURE_BACKEND_URL}/getTransfers?publicKey=${publicKey}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch history from backend DB");
      }
      let fetchedHistory: TransferHistoryRecord[] = await response.json();

      fetchedHistory = await Promise.all(
        fetchedHistory.map(async (record) => {
          try {
            const statusResult = await getMappingObjectValue<{
              confirmations: number;
              executed: boolean;
            }>(
              network,
              "transfers_status",
              record.transferId,
              TRANSFER_MANAGER_PROGRAM_ID
            );
            const newStatus = statusResult.executed
              ? "Executed"
              : record.confirmations < record.threshold
              ? "Pending"
              : "Confirmed";
            if (newStatus !== record.status) {
              await updateStatusInBackendDB(
                record.transferId,
                newStatus,
                statusResult.confirmations
              );
              record.status = newStatus;
              record.confirmations = statusResult.confirmations;
            }

            if (
              walletRecord &&
              record.encryptedData &&
              walletRecord.data.owners.includes(publicKey as string)
            ) {
              try {
                const decrypted = await decryptViaBackend(
                  walletRecord,
                  record.encryptedData
                );
                record.encryptedData = JSON.stringify(decrypted);
              } catch (decryptErr) {
                console.warn("Decryption failed:", decryptErr);
              }
            }
            return record;
          } catch (error) {
            return { ...record, status: "Failed" };
          }
        })
      );

      const userHistory = fetchedHistory.filter(
        (h) => h.status !== "Executed" || h.encryptedData
      );

      setHistory(userHistory);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setError(error as Error);
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchTransferHistory();
    }
  }, [publicKey]);

  return {
    history,
    isLoading,
    error,
    reset,
    addTransferToHistory,
    scanAndUpdateStatus,
    fetchTransferHistory,
  };
}
