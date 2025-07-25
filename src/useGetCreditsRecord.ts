import { useState } from "react";
import { BaseRecord } from "./utils";
import { useZeroWallet } from "./context/ZeroSecureContext";

export interface CreditsRecord extends BaseRecord {
  data: {
    microcredits: string;
  };
}

export function useGetCreditsRecord() {
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

  const getCreditsRecord = async () => {
    if (!publicKey || !requestRecords) {
      return setError(new Error("Wallet not connected"));
    }

    try {
      setIsProcessing(true);
      let records: CreditsRecord[] = await requestRecords("credits.aleo");
      setIsProcessing(false);
      return records
        .map((record) => {
          let recordName = record.recordName || record.name;
          if (record.spent || recordName !== "credits") return null;
          if (record.status && record.status !== "Unspent") return null;
          return record;
        })
        .filter((record) => record !== null);
    } catch (error) {
      setIsProcessing(false);
      setError(error as Error);
    }
  };

  return { isProcessing, error, reset, getCreditsRecord };
}
