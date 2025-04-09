import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  BASE_FEE,
  getRandomFieldFromServer,
  GOVERNANCE_MANAGER_PROGRAM_ID,
  removeContractDataType,
  TransactionOptions,
  waitTransactionToBeConfirmedOrError,
  ZERO_ADDRESS,
} from "./utils";
import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletRecord } from "./useGetWalletCreated";

export function useCreateChangeGovernance({
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

    if (newOwners.length === 0) {
      return setError(new Error("Owners cannot be empty"));
    }

    if (newOwners.length > 8) {
      return setError(new Error("Owners cannot be more than 8"));
    }

    if (newThreshold < 1) {
      return setError(new Error("Threshold cannot be less than 1"));
    }

    // make sure all onwers are valid addresses
    for (let owner of newOwners) {
      if (owner.length !== 63) {
        return setError(new Error("Invalid owner address " + owner));
      }
    }

    //check if the threshold is less than the number of owners
    if (newThreshold > newOwners.length) {
      return setError(
        new Error("Threshold cannot be greater than the number of owners")
      );
    }

    //check address is unique in the owners array except the zero address
    let uniqueOwners = newOwners.filter(
      (owner, index) =>
        newOwners.indexOf(owner) === index && owner !== ZERO_ADDRESS
    );
    let newOwnersWithoutZeroAddress = newOwners.filter(
      (owner) => owner !== ZERO_ADDRESS
    );
    if (uniqueOwners.length !== newOwnersWithoutZeroAddress.length) {
      return setError(new Error("Duplicate owner address found"));
    }

    //fill the owners array with the zero address
    while (newOwners.length < 8) {
      newOwners.push(ZERO_ADDRESS);
    }

    let ownersFormated = newOwners
      .map((owner) => removeContractDataType(owner))
      .toString();

    let transaction = new Transaction(
      publicKey as string,
      network,
      [
        {
          program: GOVERNANCE_MANAGER_PROGRAM_ID,
          functionName: "change_governance",
          inputs: [
            wallet,
            randomField,
            `[${ownersFormated}]`,
            newThreshold + "u8",
          ],
        },
      ],
      BASE_FEE.change_governance,
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
