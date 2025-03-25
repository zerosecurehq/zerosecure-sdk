import {
  AleoTransaction,
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState } from "react";
import { CreditsRecord } from "./useGetCreditsRecord";
import {
  TransactionOptions,
  BASE_FEE,
  waitTransactionToBeConfirmedOrError,
  ZEROSECURE_PROGRAM_ID,
} from "./utils";

export function useCreateDeposit({
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
   * @param to address to deposit to
   * @param amount amount to deposit in microcredits (1 credit = 1_000_000 microcredits)
   * @param feeRecord if use feeRecord, deposit will be private (recommended) otherwise who deposited will be public
   * @returns transaction id
   */
  const createDeposit = async (
    to: string,
    amount: number,
    feeRecord?: CreditsRecord
  ) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    if (amount <= 0) {
      return setError(new Error("Amount must be greater than 0"));
    }

    if (to.length !== 63) {
      return setError(new Error("Invalid address"));
    }

    let transaction: AleoTransaction;

    if (feeRecord) {
      transaction = Transaction.createTransaction(
        publicKey,
        network,
        ZEROSECURE_PROGRAM_ID,
        "deposit_private",
        [to, amount + "u64", feeRecord],
        BASE_FEE.deposit_private,
        feePrivate
      );
    } else {
      transaction = Transaction.createTransaction(
        publicKey,
        network,
        ZEROSECURE_PROGRAM_ID,
        "deposit_public",
        [to, amount + "u64"],
        BASE_FEE.deposit_public,
        feePrivate
      );
    }

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

  return { createDeposit, isProcessing, error, reset, txId };
}
