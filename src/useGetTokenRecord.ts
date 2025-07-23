import { useState } from "react";
import { BaseRecord, removeVisibleModifier } from "./utils";
import { useZeroWallet } from "./context/ZeroSecureContext";

export interface TokenRecord extends BaseRecord {
  data: {
    amount: string; //u128
    token_id: string; //field
    external_authorization_required: string; //bool
    authorized_until: string; //u32
  };
}

export function useGetTokenRecord() {
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

  const getTokenRecord = async (tokenId: string) => {
    if (!publicKey || !requestRecords) {
      return setError(new Error("Wallet not connected"));
    }

    try {
      setIsProcessing(true);
      let records: TokenRecord[] = await requestRecords("token_registry.aleo");
      setIsProcessing(false);
      return records
        .map((record) => {
          let recordName = record.recordName || record.name;
          if (record.spent || recordName !== "Token") return null;
          if (record.status && record.status !== "Unspent") return null;
          return record;
        })
        .filter(
          (record) =>
            record !== null &&
            removeVisibleModifier(record.data.token_id) === tokenId
        );
    } catch (error) {
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { isProcessing, error, reset, getTokenRecord };
}
