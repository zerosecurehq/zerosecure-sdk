import JSON5 from "json5";
import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { ConfirmTransferTicketRecord } from "../useConfirmTransferTicket";
import { ExecuteTicketRecord } from "../useExecuteTransferTicket";
import {
  RPC_SERVER_MAINNET_BETA,
  RPC_SERVER_TESTNET_BETA,
  TRANSFER_MANAGER_PROGRAM_ID,
  WALLET_MANAGER_PROGRAM_ID,
  ZEROSECURE_BACKEND_URL,
} from "./config";
import { ConfirmChangeGovernanceTicketRecord } from "../useConfirmChangeGovernanceTicket";
import { ExecuteChangeGovernanceTicketRecord } from "../useExecuteChangeGovernanceTicket";
import { WalletRecord } from "../useGetWalletCreated";
import { calcEncryptionKeyFromWalletRecord } from "./crypto";

export function removeVisibleModifier(value: string) {
  if (value.includes(".")) {
    return value.split(".")[0];
  } else {
    return value;
  }
}

export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitTransactionToBeConfirmedOrError(
  txId: string,
  transactionStatus: (txId: string) => Promise<string>
) {
  while (true) {
    await wait(300);
    let status: "Finalized" | "Failed" | "Rejected" = (await transactionStatus(
      txId
    )) as any;
    console.log("Waiting for transaction to be confirmed...", status);
    if (status === "Finalized") {
      break;
    } else if (status === "Failed" || status === "Rejected") {
      throw new Error("Transaction failed, see more details in your wallet");
    }
  }
}

export async function getMappingValue(
  network: WalletAdapterNetwork,
  mapping: string,
  key: string,
  programId: string
): Promise<{
  result: string | null;
  error: any | null;
}> {
  return await fetch(
    network === WalletAdapterNetwork.MainnetBeta
      ? RPC_SERVER_MAINNET_BETA
      : RPC_SERVER_TESTNET_BETA,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getMappingValue",
        params: {
          program_id: programId,
          mapping_name: mapping,
          key: key,
        },
      }),
    }
  ).then((res) => res.json());
}

export async function getMultisigWalletBalance(
  network: WalletAdapterNetwork,
  multisigWalletAddress: string
): Promise<number> {
  let multisigWalletAddressHashedToField: string =
    await hashAddressToFieldFromServer(
      network,
      removeVisibleModifier(multisigWalletAddress)
    ); // remove the visibility modifier
  let result = await getMappingValue(
    network,
    "balances",
    multisigWalletAddressHashedToField,
    TRANSFER_MANAGER_PROGRAM_ID
  );
  if (result.result === null) {
    throw new Error("Multisig wallet not found");
  } else {
    return parseInt(result.result);
  }
}

export async function filterOutExecutedTransferTickets<
  T extends ConfirmTransferTicketRecord | ExecuteTicketRecord
>(network: WalletAdapterNetwork, tickets: T[]) {
  let transfersExecuted: {
    [key: string]: boolean;
  } = {};

  try {
    let transfersExecutedCacheString =
      localStorage.getItem("transfersExecuted");
    if (transfersExecutedCacheString) {
      transfersExecuted = JSON.parse(transfersExecutedCacheString);
    }
  } catch (e) {}

  let finalTickets: T[] = [];
  for (let ticket of tickets) {
    if (transfersExecuted[ticket.data.transfer_id]) {
      continue;
    }
    let result: {
      result: string | null;
      error: any | null;
    } = await getMappingValue(
      network,
      "transfers_status",
      removeVisibleModifier(ticket.data.transfer_id),
      TRANSFER_MANAGER_PROGRAM_ID
    );

    if (result.result !== null) {
      finalTickets.push(ticket);
    } else if (result.result === null && !result.error) {
      transfersExecuted[ticket.data.transfer_id] = true;
    }
  }

  localStorage.setItem("transfersExecuted", JSON.stringify(transfersExecuted));

  return finalTickets;
}

export async function filterOutExecutedChangeGovernanceTickets<
  T extends
    | ConfirmChangeGovernanceTicketRecord
    | ExecuteChangeGovernanceTicketRecord
>(network: WalletAdapterNetwork, tickets: T[]) {
  let ticketsExecuted: {
    [key: string]: boolean;
  } = {};

  try {
    let ticketsExecutedCacheString = localStorage.getItem(
      "governancesExecuted"
    );
    if (ticketsExecutedCacheString) {
      ticketsExecuted = JSON.parse(ticketsExecutedCacheString);
    }
  } catch (e) {}

  let finalTickets: T[] = [];
  for (let ticket of tickets) {
    if (ticketsExecuted[ticket.data.request_id]) {
      continue;
    }
    let result: {
      result: string | null;
      error: any | null;
    } = await getMappingValue(
      network,
      "wallet_sequence",
      await hashAddressToFieldFromServer(
        network,
        removeVisibleModifier(ticket.data.wallet_address)
      ),
      WALLET_MANAGER_PROGRAM_ID
    );

    let onchainSequence = parseInt(result.result);
    if (onchainSequence === parseInt(ticket.data.sequence)) {
      finalTickets.push(ticket);
    } else if (!result.error) {
      ticketsExecuted[ticket.data.request_id] = true;
    }
  }

  localStorage.setItem("governancesExecuted", JSON.stringify(ticketsExecuted));

  return finalTickets;
}

export async function filterOutdatedWalletRecord<T extends WalletRecord>(
  network: WalletAdapterNetwork,
  wallets: T[]
) {
  let outdatedWallets: {
    [key: string]: boolean;
  } = {};

  try {
    let walletCacheString = localStorage.getItem("walletSequence");
    if (walletCacheString) {
      outdatedWallets = JSON.parse(walletCacheString);
    }
  } catch (e) {}

  let finalWallets: T[] = [];
  for (let wallet of wallets) {
    if (outdatedWallets[calcEncryptionKeyFromWalletRecord(wallet)]) {
      continue;
    }
    let result: {
      result: string | null;
      error: any | null;
    } = await getMappingValue(
      network,
      "wallet_sequence",
      await hashAddressToFieldFromServer(
        network,
        removeVisibleModifier(wallet.data.wallet_address)
      ),
      WALLET_MANAGER_PROGRAM_ID
    );

    let onchainSequence = parseInt(result.result);
    if (onchainSequence === parseInt(wallet.data.sequence)) {
      finalWallets.push(wallet);
    } else if (!result.error) {
      outdatedWallets[calcEncryptionKeyFromWalletRecord(wallet)] = true;
    }
  }

  localStorage.setItem("walletSequence", JSON.stringify(outdatedWallets));

  return finalWallets;
}

export async function getRandomAddressFromServer(
  network: WalletAdapterNetwork
) {
  let networkText =
    network === WalletAdapterNetwork.MainnetBeta ? "mainnet" : "testnetbeta";
  return await fetch(
    `${ZEROSECURE_BACKEND_URL}/${networkText}/utils/randomAddress`
  ).then((res) => res.text());
}

export async function getRandomFieldFromServer(network: WalletAdapterNetwork) {
  let networkText =
    network === WalletAdapterNetwork.MainnetBeta ? "mainnet" : "testnetbeta";
  return await fetch(
    `${ZEROSECURE_BACKEND_URL}/${networkText}/utils/randomField`
  ).then((res) => res.text());
}

export async function hashAddressToFieldFromServer(
  network: WalletAdapterNetwork,
  address: string
) {
  let networkText =
    network === WalletAdapterNetwork.MainnetBeta ? "mainnet" : "testnetbeta";
  return await fetch(
    `${ZEROSECURE_BACKEND_URL}/${networkText}/utils/hashAddressToField`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wallet_address: address,
      }),
    }
  ).then((res) => res.text());
}

export async function getCurrentTransactionConfirmations(
  network: WalletAdapterNetwork,
  transferId: string
) {
  let object: {
    confirmations: number;
  } = await getMappingObjectValue(
    network,
    "transfers_status",
    removeVisibleModifier(transferId),
    TRANSFER_MANAGER_PROGRAM_ID
  );

  return object.confirmations;
}

export function removeContractDataType(value: string) {
  return value.replace(
    /bool|i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|field|group|scalar|address|signature/g,
    ""
  );
}

export async function getMappingObjectValue<T>(
  network: WalletAdapterNetwork,
  mapping: string,
  key: string,
  programId: string
) {
  let result = await getMappingValue(
    network,
    mapping,
    removeVisibleModifier(key),
    programId
  );
  if (result.result === null) {
    throw new Error("Mapping not found");
  }
  let removedContractDataTypeResult = removeContractDataType(result.result);
  let addressWrappedResult = removedContractDataTypeResult.replace(
    /(\w+:)\s*(aleo1[a-zA-Z0-9]{58})/g,
    "$1 '$2'"
  );

  let object: T = JSON5.parse(addressWrappedResult);
  return object;
}
