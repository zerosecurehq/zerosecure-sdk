import { useState } from "react";
import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  BASE_FEE,
  filterOutExecutedTransferTickets,
  waitTransactionToBeConfirmedOrError,
  BaseRecord,
  TransactionOptions,
  TRANSFER_MANAGER_PROGRAM_ID,
} from "./utils";
import { useZeroWallet } from "./context/ZeroSecureContext";

export interface ConfirmTransferTicketData {
  wallet_address: string;
  token_id: string; // field
  to: string;
  amount: string; // u128
  transfer_id: string; // field
  threshold: string; // u8
}

export interface ConfirmTransferTicketRecord extends BaseRecord {
  data: ConfirmTransferTicketData;
}

export function useGetConfirmTransferTicket({
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestRecords } = useZeroWallet();
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
   * @returns all unspent confirm transfer tickets
   */
  const getConfirmTransferTicket = async () => {
    try {
      if (!publicKey || !requestRecords) {
        return setError(new Error("Wallet not connected"));
      }
      setIsProcessing(true);
      let confirmTransfersTicketsAll: ConfirmTransferTicketRecord[] =
        await requestRecords(TRANSFER_MANAGER_PROGRAM_ID);

      let confirmTransfersTicketsUnspent = confirmTransfersTicketsAll
        .map((ticket) => {
          let recordName = ticket.recordName || ticket.name;
          if (ticket.spent || recordName !== "ConfirmTransferTicket")
            return null;
          return ticket;
        })
        .filter((ticket) => ticket !== null);

      let finalTickets = await filterOutExecutedTransferTickets(
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
  let { publicKey, requestTransaction, transactionStatus } = useZeroWallet();
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState<Error | null>(null);
  let [txId, setTxId] = useState<string | null>(null);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
    setTxId(null);
    setIsProcessing(false);
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
      TRANSFER_MANAGER_PROGRAM_ID,
      "confirm_transfer",
      [confirmTransferTicket],
      BASE_FEE.confirm_transfer,
      feePrivate
    );

    try {
      setIsProcessing(true);
      let txId = await requestTransaction(transaction);
      setTxId(txId);
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

  return { applyConfirmTransferTicket, isProcessing, error, reset, txId };
}
