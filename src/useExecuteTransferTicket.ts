import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState } from "react";
import {
  BASE_FEE,
  filterOutExecutedTickets,
  waitTransactionToBeConfirmedOrError,
  ZEROSECURE_PROGRAM_ID,
  BaseRecord,
  TransactionOptions,
} from "./utils";

export interface ExecuteTicketData {
  wallet_address: string;
  amount: string;
  transfer_id: string;
  to: string;
}

export interface ExecuteTicketRecord extends BaseRecord {
  data: ExecuteTicketData;
  id: string;
}

export function useGetExecuteTicket({
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestRecords } = useWallet();
  let [error, setError] = useState<Error | null>(null);
  let [isProcessing, setIsProcessing] = useState(false);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
  };

  const getExecuteTicket = async () => {
    try {
      if (!publicKey || !requestRecords) {
        return setError(new Error("Wallet not connected"));
      }
      setIsProcessing(true);
      let executeTransfersTicketsAll: ExecuteTicketRecord[] =
        await requestRecords(ZEROSECURE_PROGRAM_ID);
      setIsProcessing(false);
      let executeTransfersTicketsUnspent = executeTransfersTicketsAll
        .map((ticket) => {
          let recordName = ticket.recordName || ticket.name;
          if (ticket.spent || recordName !== "ExecuteTransferTicket")
            return null;
          return ticket;
        })
        .filter((wallet) => wallet !== null);

      let finalTickets = await filterOutExecutedTickets(
        network,
        executeTransfersTicketsUnspent
      );

      return finalTickets;
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { getExecuteTicket, error, reset, isProcessing };
}

export function useApplyExecuteTicket({
  feePrivate = true,
  waitToBeConfirmed = true,
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestTransaction, transactionStatus } = useWallet();
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState<Error | null>(null);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
  };

  const applyExecuteTicket = async (ticket: ExecuteTicketRecord) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    let transaction = Transaction.createTransaction(
      publicKey,
      network,
      ZEROSECURE_PROGRAM_ID,
      "execute_transfer",
      [ticket],
      BASE_FEE,
      feePrivate
    );

    try {
      setIsProcessing(true);
      let txId = await requestTransaction(transaction);
      if (waitToBeConfirmed) {
        try {
          await waitTransactionToBeConfirmedOrError(txId, transactionStatus);
        } catch (error) {
          return setError(error as Error);
        }
      }
      setIsProcessing(false);
      return txId;
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { applyExecuteTicket, isProcessing, error, reset };
}
