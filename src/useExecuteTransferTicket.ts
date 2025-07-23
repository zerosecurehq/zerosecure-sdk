import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useState } from "react";
import {
  BASE_FEE,
  filterOutExecutedTransferTickets,
  waitTransactionToBeConfirmedOrError,
  BaseRecord,
  TransactionOptions,
  CREDITS_TOKEN_ID,
  getMappingObjectValue,
  TRANSFER_MANAGER_PROGRAM_ID,
  removeVisibleModifier,
} from "./utils";
import { useZeroWallet } from "./context/ZeroSecureContext";

export interface ExecuteTicketData {
  wallet_address: string;
  token_id: string; // field
  to: string;
  amount: string; // u128
  transfer_id: string; // field
  threshold: string; // u8
}

export interface ExecuteTicketRecord extends BaseRecord {
  data: ExecuteTicketData;
  id: string;
}

export function useGetExecuteTicket({
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestRecords } = useZeroWallet();
  let [error, setError] = useState<Error | null>(null);
  let [isProcessing, setIsProcessing] = useState(false);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
    setIsProcessing(false);
  };

  const getExecuteTicket = async () => {
    try {
      if (!publicKey || !requestRecords) {
        return setError(new Error("Wallet not connected"));
      }
      setIsProcessing(true);
      let executeTransfersTicketsAll: ExecuteTicketRecord[] =
        await requestRecords(TRANSFER_MANAGER_PROGRAM_ID);
      setIsProcessing(false);
      let executeTransfersTicketsUnspent = executeTransfersTicketsAll
        .map((ticket) => {
          let recordName = ticket.recordName || ticket.name;
          if (ticket.spent || recordName !== "ExecuteTransferTicket")
            return null;
          return ticket;
        })
        .filter((wallet) => wallet !== null);

      let finalTickets = await filterOutExecutedTransferTickets(
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

  const applyExecuteTicket = async (ticket: ExecuteTicketRecord) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    let isCreditsTransfer =
      removeVisibleModifier(ticket.data.token_id) === CREDITS_TOKEN_ID;
    let external_authorization_required: boolean;
    try {
      if (!isCreditsTransfer) {
        let tokenMetaData = await getMappingObjectValue<{
          external_authorization_required: boolean;
        }>(
          network,
          "registered_tokens",
          removeVisibleModifier(ticket.data.token_id),
          "token_registry.aleo"
        );
        external_authorization_required =
          tokenMetaData.external_authorization_required;
      }
    } catch {
      return setError(new Error("Error fetching token metadata"));
    }

    let transaction = Transaction.createTransaction(
      publicKey,
      network,
      TRANSFER_MANAGER_PROGRAM_ID,
      isCreditsTransfer ? "execute_aleo_transfer" : "execute_token_transfer",
      isCreditsTransfer
        ? [ticket]
        : [ticket, `${external_authorization_required}`],
      isCreditsTransfer
        ? BASE_FEE.execute_aleo_transfer
        : BASE_FEE.execute_token_transfer,
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

  return { applyExecuteTicket, isProcessing, error, reset, txId };
}
