import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
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

export interface ExecuteChangeGovernanceTicketData {
  request_id: string; // field
  wallet_address: string;
  sequence: string; // u64
  new_owners: string[];
  new_threshold: string; // u8
  old_threshold: string; // u8
}

export interface ExecuteChangeGovernanceTicketRecord extends BaseRecord {
  data: ExecuteChangeGovernanceTicketData;
}

export function useGetExecuteChangeGovernanceTicket({
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
    setIsProcessing(false);
  };

  /**
   *
   * @returns all unspent execute tickets
   */
  const getExecuteGovernanceTicket = async () => {
    try {
      if (!publicKey || !requestRecords) {
        return setError(new Error("Wallet not connected"));
      }
      setIsProcessing(true);
      let tickets: ExecuteChangeGovernanceTicketRecord[] = await requestRecords(
        GOVERNANCE_MANAGER_PROGRAM_ID
      );

      let unspentTickets = tickets
        .map((ticket) => {
          let recordName = ticket.recordName || ticket.name;
          if (ticket.spent || recordName !== "ExecuteChangeGovernanceTicket")
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

  return { getExecuteGovernanceTicket, isProcessing, error, reset };
}

export function useApplyExecuteChangeGovernanceTicket({
  feePrivate = true,
  waitToBeConfirmed = true,
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestTransaction, transactionStatus } = useWallet();
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
  const applyExecuteChangeGovernanceTicket = async (
    ticket: ExecuteChangeGovernanceTicketRecord
  ) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    let transaction = Transaction.createTransaction(
      publicKey,
      network,
      GOVERNANCE_MANAGER_PROGRAM_ID,
      "execute_change_governance",
      [ticket],
      BASE_FEE.execute_change_governance,
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
    applyExecuteChangeGovernanceTicket,
    isProcessing,
    error,
    reset,
    txId,
  };
}
