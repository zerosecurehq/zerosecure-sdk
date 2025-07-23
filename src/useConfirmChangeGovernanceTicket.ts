import { useState } from "react";
import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  BASE_FEE,
  waitTransactionToBeConfirmedOrError,
  BaseRecord,
  TransactionOptions,
  GOVERNANCE_MANAGER_PROGRAM_ID,
  filterOutExecutedChangeGovernanceTickets,
} from "./utils";
import { useZeroWallet } from "./context/ZeroSecureContext";

export interface ConfirmChangeGovernanceTicketData {
  request_id: string; // field
  wallet_address: string;
  sequence: string; // u64
  new_owners: string[];
  new_threshold: string; // u8
  old_threshold: string; // u8
}

export interface ConfirmChangeGovernanceTicketRecord extends BaseRecord {
  data: ConfirmChangeGovernanceTicketData;
}

export function useGetConfirmChangeGovernanceTicket({
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
   * @returns all unspent confirm tickets
   */
  const getConfirmGovernanceTicket = async () => {
    try {
      if (!publicKey || !requestRecords) {
        return setError(new Error("Wallet not connected"));
      }
      setIsProcessing(true);
      let tickets: ConfirmChangeGovernanceTicketRecord[] = await requestRecords(
        GOVERNANCE_MANAGER_PROGRAM_ID
      );

      let unspentTickets = tickets
        .map((ticket) => {
          let recordName = ticket.recordName || ticket.name;
          if (ticket.spent || recordName !== "ConfirmChangeGovernanceTicket")
            return null;
          return ticket;
        })
        .filter((ticket) => ticket !== null);

      let finalTickets = await filterOutExecutedChangeGovernanceTickets(
        network,
        unspentTickets
      );
      setIsProcessing(false);
      return finalTickets;
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { getConfirmGovernanceTicket, isProcessing, error, reset };
}

export function useApplyConfirmChangeGovernanceTicket({
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
   * @param ticket the ticket to confirm
   * @returns transaction id
   */
  const applyConfirmChangeGovernanceTicket = async (
    ticket: ConfirmChangeGovernanceTicketRecord
  ) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    let transaction = Transaction.createTransaction(
      publicKey,
      network,
      GOVERNANCE_MANAGER_PROGRAM_ID,
      "confirm_change_governance",
      [ticket],
      BASE_FEE.confirm_change_governance,
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

  return {
    applyConfirmChangeGovernanceTicket,
    isProcessing,
    error,
    reset,
    txId,
  };
}
