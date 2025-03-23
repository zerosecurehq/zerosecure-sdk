import { BaseRecord } from "./utils";
export interface WalletRecordData {
    wallet_address: string;
    owners: string[];
    threshold: number;
}
export interface WalletRecord extends BaseRecord {
    data: WalletRecordData;
}
export declare function useGetWalletCreated(): {
    getWalletCreated: () => Promise<void | WalletRecord[]>;
    isProcessing: boolean;
    error: Error;
    reset: () => void;
};
