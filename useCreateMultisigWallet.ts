import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { PrivateKey, Address } from "@provablehq/wasm/testnet.js";
import { useState } from "react";
import {
  BASE_FEE,
  waitTransactionToBeConfirmedOrError,
  ZEROSECURE_PROGRAM_ID,
  TransactionOptions,
} from "./utils/";

export interface MultisigWallet {
  address?: string;
  owners: string[];
  threshold: number;
}

const ZERO_ADDRESS =
  "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc";

export function useCreateMultisigWallet({
  feePrivate = true,
  waitToBeConfirmed = true,
  network = WalletAdapterNetwork.TestnetBeta,
}: TransactionOptions = {}) {
  let { publicKey, requestTransaction, transactionStatus } = useWallet();
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState<Error | null>(null);

  /**
   * Reset the error state
   */
  const reset = () => {
    setError(null);
  };

  /**
   *
   * @param multisigWallet the multisig wallet object
   * @returns transaction id
   */
  const createMultisigWallet = async (multisigWallet: MultisigWallet) => {
    if (!publicKey || !requestTransaction || !transactionStatus) {
      return setError(new Error("Wallet not connected"));
    }
    if (!multisigWallet.address) {
      //create 32 random bytes Uint8Array
      let randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      //create a random address from the random bytes
      let random_address = Address.from_private_key(
        PrivateKey.from_seed_unchecked(randomBytes)
      );
      // set the address to the multisigWallet object
      multisigWallet.address = random_address.to_string();
    }

    if (multisigWallet.owners.length === 0) {
      return setError(new Error("Owners cannot be empty"));
    }

    if (multisigWallet.owners.length > 8) {
      return setError(new Error("Owners cannot be more than 8"));
    }

    if (multisigWallet.threshold < 1) {
      return setError(new Error("Threshold cannot be less than 1"));
    }

    // make sure all onwers are valid addresses
    for (let owner of multisigWallet.owners) {
      if (owner.length !== 63) {
        return setError(new Error("Invalid owner address " + owner));
      }
    }

    //check if the threshold is less than the number of owners
    if (multisigWallet.threshold > multisigWallet.owners.length) {
      return setError(
        new Error("Threshold cannot be greater than the number of owners")
      );
    }

    //fill the owners array with the zero address
    while (multisigWallet.owners.length < 8) {
      multisigWallet.owners.push(ZERO_ADDRESS);
    }

    let transaction = new Transaction(
      publicKey as string,
      network,
      [
        {
          program: ZEROSECURE_PROGRAM_ID,
          functionName: "create_wallet",
          inputs: [
            multisigWallet.address,
            `[${multisigWallet.owners.toString()}]`,
            multisigWallet.threshold.toString() + "u8",
          ],
        },
      ],
      BASE_FEE,
      feePrivate
    );

    try {
      setIsProcessing(true);
      let txId = await requestTransaction(transaction);
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

  return { createMultisigWallet, isProcessing, error, reset };
}
