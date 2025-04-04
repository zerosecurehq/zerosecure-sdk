import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  BASE_FEE,
  getRandomFieldFromServer,
  GOVERNANCE_MANAGER_PROGRAM_ID,
  TransactionOptions,
  waitTransactionToBeConfirmedOrError,
} from "./utils";
import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletRecord } from "./useGetWalletCreated";

export default function useCreateChangeGovernance({
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

  const createChangeGovernance = async (
    wallet: WalletRecord,
    newOwners: string[],
    newThreshold: number
  ) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    let randomField: string;
    try {
      randomField = await getRandomFieldFromServer(network);
    } catch (error) {
      return setError(
        new Error("An error occurred while generating a random field element")
      );
    }

    let transaction = new Transaction(
      publicKey as string,
      network,
      [
        {
          program: GOVERNANCE_MANAGER_PROGRAM_ID,
          functionName: "create_wallet",
          inputs: [wallet, randomField, newOwners, newThreshold + "u8"],
        },
      ],
      // TODO: change fee
      BASE_FEE.create_wallet,
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
    } catch (error: any) {
      console.error(error);
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { createChangeGovernance, isProcessing, error, reset, txId };
}
