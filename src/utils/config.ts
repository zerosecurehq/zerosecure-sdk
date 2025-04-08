export const ZEROSECURE_BACKEND_URL = "http://localhost:3000";
export const RPC_SERVER_TESTNET_BETA = "https://testnetbeta.aleorpc.com";
export const RPC_SERVER_MAINNET_BETA = "https://mainnet.aleorpc.com";

export const WALLET_MANAGER_PROGRAM_ID = "zerosecure_wallet_manager_v4.aleo";
export const TRANSFER_MANAGER_PROGRAM_ID = "zerosecure_transfer_managerv2.aleo";
export const GOVERNANCE_MANAGER_PROGRAM_ID =
  "zerosecure_governance_managerv2.aleo";

export const CREDITS_TOKEN_ID =
  "3443843282313283355522573239085696902919850365217539366784739393210722344986field";
export const ZERO_ADDRESS =
  "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc";

export const BASE_FEE = {
  ////// Wallet Manager Fees //////
  create_wallet: 26_500,
  ////// Wallet Transfer Fees //////
  deposit_token_public: 116_665,
  deposit_token_private: 87_585,
  deposit_aleo_public: 52_821,
  deposit_aleo_private: 37_237,
  create_transfer: 38_446,
  confirm_transfer: 20_493,
  execute_aleo_transfer: 50_934,
  execute_token_transfer: 69_317,
  ////// Wallet Governance Fees //////
  change_governance: 61_154,
  confirm_change_governance: 21_797,
  execute_change_governance: 101_793,
};
