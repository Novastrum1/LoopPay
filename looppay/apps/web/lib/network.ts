import { loadNetwork } from "@looppay/config";
// Explicit property references are required for Next.js public environment substitution.
export const publicEnv = {
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_EXPLORER_URL: process.env.NEXT_PUBLIC_EXPLORER_URL,
  NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
  NEXT_PUBLIC_CHECKOUT_ADDRESS: process.env.NEXT_PUBLIC_CHECKOUT_ADDRESS,
  NEXT_PUBLIC_REWARDS_ADDRESS: process.env.NEXT_PUBLIC_REWARDS_ADDRESS,
  NEXT_PUBLIC_STABLECOIN_ADDRESS: process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS,
  NEXT_PUBLIC_TOKEN_SYMBOL: process.env.NEXT_PUBLIC_TOKEN_SYMBOL,
  NEXT_PUBLIC_TOKEN_DECIMALS: process.env.NEXT_PUBLIC_TOKEN_DECIMALS,
};
export function configuredNetwork() {
  try {
    return loadNetwork(publicEnv);
  } catch {
    return null;
  }
}
