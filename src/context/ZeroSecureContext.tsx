import React from "react";
import { WalletContextState } from "@demox-labs/aleo-wallet-adapter-react";
import { useContext, createContext } from "react";

const ZeroSecureWalletContext =
  createContext<() => WalletContextState | null>(null);

function useZeroWallet(): WalletContextState {
  let useWallet = useContext(ZeroSecureWalletContext);
  if (useWallet === null) {
    throw new Error(
      "ZeroSecure useZeroWallet is not provided. Please wrap your application in a ZeroSecureProvider"
    );
  }

  return useWallet();
}

function ZeroSecureProvider({
  children,
  useWallet,
}: {
  children: React.ReactNode;
  useWallet: () => WalletContextState;
}) {
  return (
    <ZeroSecureWalletContext.Provider value={useWallet}>
      {children}
    </ZeroSecureWalletContext.Provider>
  );
}

export { ZeroSecureProvider, useZeroWallet };
