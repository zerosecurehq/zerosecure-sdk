import {
  AleoTransaction,
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState } from "react";
import {
  TransactionOptions,
  BASE_FEE,
  waitTransactionToBeConfirmedOrError,
  CREDITS_TOKEN_ID,
  TRANSFER_MANAGER_PROGRAM_ID,
} from "./utils";
import { CreditsRecord } from "./useGetCreditsRecord";
import { TokenRecord } from "./useGetTokenRecord";

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
   * @param tokenId token id to deposit (default to CREDITS_TOKEN_ID)
   * @param to address to deposit to
   * @param amount amount to deposit in microcredits (1 credit = 1_000_000 microcredits)
   * @param depositRecord if use depositRecord, deposit will be private (recommended) otherwise who deposited will be public
   * @returns transaction id
   */
  const createDeposit = async (
    tokenId: string,
    to: string,
    amount: number,
    depositRecord?: CreditsRecord | TokenRecord // tokenId === CREDITS_TOKEN_ID ? CreditsRecord : TokenRecord
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
    let isCreditsDeposit = tokenId === CREDITS_TOKEN_ID;
    if (depositRecord) {
      transaction = Transaction.createTransaction(
        publicKey,
        network,
        TRANSFER_MANAGER_PROGRAM_ID,
        isCreditsDeposit ? "deposit_aleo_private" : "deposit_token_private",
        [to, amount + "u128", depositRecord as TokenRecord],
        // TODO: use different fee for token deposit
        BASE_FEE.deposit_private,
        feePrivate
      );
    } else {
      transaction = Transaction.createTransaction(
        publicKey,
        network,
        TRANSFER_MANAGER_PROGRAM_ID,
        isCreditsDeposit ? "deposit_aleo_public" : "deposit_token_public",
        isCreditsDeposit
          ? [to, amount + "u128"]
          : [to, tokenId, amount + "u128"],
        // TODO: use different fee for token deposit
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
