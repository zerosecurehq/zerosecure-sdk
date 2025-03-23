import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState } from "react";
import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  BASE_FEE,
  filterOutExecutedTickets,
  waitTransactionToBeConfirmedOrError,
  ZEROSECURE_PROGRAM_ID,
  BaseRecord,
  TransactionOptions,
} from "./utils";

export interface ConfirmTransferTicketData {
  wallet_address: string;
  amount: string;
  transfer_id: string;
  to: string;
}

export interface ConfirmTransferTicketRecord extends BaseRecord {
  data: ConfirmTransferTicketData;
}

export function useGetConfirmTransferTicket({
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestRecords } = useWallet();
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState<Error | null>(null);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
  };

  /**
   *
   * @returns all unspent confirm transfer tickets
   */
  const getConfirmTransferTicket = async () => {
    try {
      if (!publicKey || !requestRecords) {
        throw new Error("Wallet not connected");
      }
      setIsProcessing(true);
      let confirmTransfersTicketsAll: ConfirmTransferTicketRecord[] =
        await requestRecords(ZEROSECURE_PROGRAM_ID);

      let confirmTransfersTicketsUnspent = confirmTransfersTicketsAll
        .map((ticket) => {
          let recordName = ticket.recordName || ticket.name;
          if (ticket.spent || recordName !== "ConfirmTransferTicket")
            return null;
          return ticket;
        })
        .filter((ticket) => ticket !== null);

      let finalTickets = await filterOutExecutedTickets(
        network,
        confirmTransfersTicketsUnspent
      );
      setIsProcessing(false);
      return finalTickets;
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { getConfirmTransferTicket, isProcessing, error, reset };
}

export function useApplyConfirmTransferTicket({
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

  /**
   *
   * @param confirmTransferTicket the ticket to confirm transfer
   * @returns transaction id
   */
  const applyConfirmTransferTicket = async (
    confirmTransferTicket: ConfirmTransferTicketRecord
  ) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    let transaction = Transaction.createTransaction(
      publicKey,
      network,
      ZEROSECURE_PROGRAM_ID,
      "confirm_transfer",
      [confirmTransferTicket],
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

  return { applyConfirmTransferTicket, isProcessing, error, reset };
}
