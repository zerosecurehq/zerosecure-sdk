import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { ConfirmTransferTicketRecord } from "../useConfirmTransferTicket";
import { ExecuteTicketRecord } from "../useExecuteTransferTicket";
import {
  RPC_SERVER_MAINNET_BETA,
  RPC_SERVER_TESTNET_BETA,
  ZEROSECURE_BACKEND_URL,
  ZEROSECURE_PROGRAM_ID,
} from "./config";

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
  mapping: "balances" | "transfers_status",
  key: string
): Promise<{
  result: string | null;
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
          program_id: ZEROSECURE_PROGRAM_ID,
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
      multisigWalletAddress.split(".")[0]
    ); // remove the visibility modifier
  let result = await getMappingValue(
    network,
    "balances",
    multisigWalletAddressHashedToField
  );
  if (result.result === null) {
    return 0;
  } else {
    return parseInt(result.result);
  }
}

export async function filterOutExecutedTickets<
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
    } = await getMappingValue(
      network,
      "transfers_status",
      ticket.data.transfer_id.split(".")[0] // remove the visibility modifier
    );

    if (result.result !== null) {
      finalTickets.push(ticket);
    } else if (result.result === null) {
      transfersExecuted[ticket.data.transfer_id] = true;
    }
  }

  localStorage.setItem("transfersExecuted", JSON.stringify(transfersExecuted));

  return finalTickets;
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
