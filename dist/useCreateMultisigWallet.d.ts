import { TransactionOptions } from "./utils/";
export interface MultisigWallet {
    address?: string;
    owners: string[];
    threshold: number;
}
export declare function useCreateMultisigWallet({ feePrivate, waitToBeConfirmed, network, }?: TransactionOptions): {
    createMultisigWallet: (multisigWallet: MultisigWallet) => Promise<string | void>;
    isProcessing: boolean;
    error: Error;
    reset: () => void;
};
