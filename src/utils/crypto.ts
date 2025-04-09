import sha256 from "crypto-js/sha256";
import CryptoJS from "crypto-js";
import { ExecuteTicketRecord } from "../useExecuteTransferTicket";
import { WalletRecord } from "../useGetWalletCreated";

export function calcEncryptionKeyFromWalletRecord(walletRecord: WalletRecord) {
  let string = "";
  string += walletRecord.data.wallet_address;
  for (let owner of walletRecord.data.owners) {
    string += owner;
  }
  string += walletRecord.data.threshold;
  string += walletRecord.data.sequence;
  return sha256(string).toString(CryptoJS.enc.Hex);
}

export function encryptExecuteTransaction(
  walletRecord: WalletRecord,
  executeTicketRecord: ExecuteTicketRecord
) {
  if (
    walletRecord.data.wallet_address !== executeTicketRecord.data.wallet_address
  ) {
    throw new Error(
      "Wallet of walletRecord address does not match executeTicketRecord"
    );
  }
  let encryptionKey = calcEncryptionKeyFromWalletRecord(walletRecord);
  let dataToBeEncrypted: {
    // we use snake_case for consistency with the wallet and contract
    to: string;
    amount: string;
  } = {
    to: executeTicketRecord.data.to,
    amount: executeTicketRecord.data.amount,
  };
  let encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(dataToBeEncrypted),
    encryptionKey
  );

  return encryptedData.toString();
}

export function decryptExecuteTransaction(
  walletRecord: WalletRecord,
  encryptedData: string
) {
  let encryptionKey = calcEncryptionKeyFromWalletRecord(walletRecord);
  let decryptedData = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  let decryptedString = decryptedData.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedString);
}
