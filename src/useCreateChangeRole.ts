import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
  BASE_FEE,
  removeContractDataType,
  TransactionOptions,
  waitTransactionToBeConfirmedOrError,
  WALLET_MANAGER_PROGRAM_ID,
  ZERO_ADDRESS,
} from "./utils";
import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletRecord } from "./useGetWalletCreated";

export function useCreateChangeRole({
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

  const createChangeRole = async (
    wallet: WalletRecord,
    type: "admin" | "managers",
    data: {
      newManagers?: string[];
      newAdmin?: string;
    }
  ) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }

    if (type === "managers") {
      if (data.newManagers.length === 0) {
        return setError(new Error("Managers cannot be empty"));
      }

      if (data.newManagers.length > 8) {
        return setError(new Error("Managers cannot be more than 8"));
      }

      // make sure all onwers are valid addresses
      for (let owner of data.newManagers) {
        if (owner.length !== 63) {
          return setError(new Error("Invalid manager address " + owner));
        }
      }

      //check address is unique in the owners array except the zero address
      let uniqueOwners = data.newManagers.filter(
        (owner, index) =>
          data.newManagers.indexOf(owner) === index && owner !== ZERO_ADDRESS
      );
      let newOwnersWithoutZeroAddress = data.newManagers.filter(
        (owner) => owner !== ZERO_ADDRESS
      );
      if (uniqueOwners.length !== newOwnersWithoutZeroAddress.length) {
        return setError(new Error("Duplicate manager address found"));
      }

      //fill the owners array with the zero address
      while (data.newManagers.length < 8) {
        data.newManagers.push(ZERO_ADDRESS);
      }
    } else if (type === "admin") {
      if (!data.newAdmin) {
        return setError(new Error("New admin cannot be empty"));
      }
      if (data.newAdmin.length !== 63) {
        return setError(
          new Error("Invalid new admin address " + data.newAdmin)
        );
      }
    }

    let ownersFormated = data.newManagers
      ?.map((owner) => removeContractDataType(owner))
      .toString();
    let newAdminFormated = removeContractDataType(data.newAdmin || "");
    let isAdminType = type === "admin";
    let transaction = new Transaction(
      publicKey as string,
      network,
      [
        {
          program: WALLET_MANAGER_PROGRAM_ID,
          functionName: isAdminType ? "change_admin" : "change_managers",
          inputs: isAdminType
            ? [wallet, newAdminFormated]
            : [wallet, `[${ownersFormated.toString()}]`],
        },
      ],
      isAdminType ? BASE_FEE.change_admin : BASE_FEE.change_managers,
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

  return { createChangeRole, isProcessing, error, reset, txId };
}
