import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState } from "react";
import { WalletRecord } from "./useGetWalletCreated";
import {
  BASE_FEE,
  waitTransactionToBeConfirmedOrError,
  ZEROSECURE_PROGRAM_ID,
  TransactionOptions,
  getRandomFieldFromServer,
} from "./utils";

export function useCreateTransaction({
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
   * @param walletRecord your wallet record
   * @param to address to send to
   * @param amount amount to send in microcredits (1 credit = 1_000_000 microcredits)
   * @returns transaction id
   */
  const createTransaction = async (
    walletRecord: WalletRecord,
    to: string,
    amount: number
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

    let randomField: string;
    try {
      randomField = await getRandomFieldFromServer(network);
    } catch (error) {
      return setError(
        new Error("An error occurred while generating a random field element")
      );
    }

    let transaction = Transaction.createTransaction(
      publicKey,
      network,
      ZEROSECURE_PROGRAM_ID,
      "create_transfer",
      [walletRecord, to, amount + "u64", randomField],
      BASE_FEE.create_transfer,
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

  return { createTransaction, isProcessing, error, reset, txId };
}
