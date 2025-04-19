export const ZEROSECURE_BACKEND_URL = "http://localhost:3000";
export const RPC_SERVER_TESTNET_BETA = "https://testnetbeta.aleorpc.com";
export const RPC_SERVER_MAINNET_BETA = "https://mainnet.aleorpc.com";

export const WALLET_MANAGER_PROGRAM_ID = "zerosecure_wallet_manager_v5.aleo";
export const TRANSFER_MANAGER_PROGRAM_ID = "zerosecure_transfer_managerv5.aleo";
export const GOVERNANCE_MANAGER_PROGRAM_ID =
  "zerosecure_governance_managerv5.aleo";

export const ALL_PROGRAM_IDS = [
  WALLET_MANAGER_PROGRAM_ID,
  TRANSFER_MANAGER_PROGRAM_ID,
  GOVERNANCE_MANAGER_PROGRAM_ID,
  "credits.aleo",
  "token_registry.aleo",
];

export const CREDITS_TOKEN_ID =
  "3443843282313283355522573239085696902919850365217539366784739393210722344986field";
export const ZERO_ADDRESS =
  "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc";
export const ZERO_ADDRESS_HASHED_TO_FIELD =
  "7833185298839889869212594806745334335817950658667461917749505843801426271110field";

export const BASE_FEE = {
  ////// Wallet Manager Fees //////
  create_wallet: 90_000,
  change_admin: 22_000,
  change_managers: 45_000,
  ////// Wallet Transfer Fees //////
  deposit_token_public: 117_000,
  deposit_token_private: 88_000,
  deposit_aleo_public: 53_000,
  deposit_aleo_private: 38_000,
  create_transfer: 39_000,
  confirm_transfer: 21_000,
  execute_aleo_transfer: 51_000,
  execute_token_transfer: 70_000,
  ////// Wallet Governance Fees //////
  change_governance: 80_000,
  confirm_change_governance: 22_000,
  execute_change_governance: 102_000,
};
