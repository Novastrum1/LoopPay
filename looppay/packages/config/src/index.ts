import { defineChain, getAddress, type Address } from "viem";
import { z } from "zod";
export const supportedDevelopmentChains = [31337, 1983] as const;
const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((v) => getAddress(v));
export const networkSchema = z.object({
  chainId: z.coerce.number().int().positive(),
  rpcUrl: z.string().url(),
  explorerUrl: z.string().url().optional(),
  registry: address,
  checkout: address,
  rewards: address,
  token: address,
  tokenSymbol: z.string().min(1),
  tokenDecimals: z.coerce.number().int().min(0).max(36),
});
export type NetworkConfig = z.infer<typeof networkSchema>;
export function loadNetwork(
  env: Record<string, string | undefined>,
): NetworkConfig {
  return networkSchema.parse({
    chainId: env.NEXT_PUBLIC_CHAIN_ID,
    rpcUrl: env.NEXT_PUBLIC_RPC_URL,
    explorerUrl: env.NEXT_PUBLIC_EXPLORER_URL || undefined,
    registry: env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    checkout: env.NEXT_PUBLIC_CHECKOUT_ADDRESS,
    rewards: env.NEXT_PUBLIC_REWARDS_ADDRESS,
    token: env.NEXT_PUBLIC_STABLECOIN_ADDRESS,
    tokenSymbol: env.NEXT_PUBLIC_TOKEN_SYMBOL,
    tokenDecimals: env.NEXT_PUBLIC_TOKEN_DECIMALS,
  });
}
export function chainFor(
  n: Pick<NetworkConfig, "chainId" | "rpcUrl" | "explorerUrl">,
) {
  return defineChain({
    id: n.chainId,
    name:
      n.chainId === 31337
        ? "Local Anvil"
        : n.chainId === 1983
          ? "QIE Testnet"
          : "QIE",
    nativeCurrency: {
      name: "QIE",
      symbol:
        n.chainId === 1990 ? "QIEV3" : n.chainId === 31337 ? "ETH" : "QIE",
      decimals: 18,
    },
    rpcUrls: { default: { http: [n.rpcUrl] } },
    ...(n.explorerUrl
      ? {
          blockExplorers: { default: { name: "Explorer", url: n.explorerUrl } },
        }
      : {}),
  });
}
export function explorerLink(
  base: string | undefined,
  hash: string,
): string | undefined {
  if (!base || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return undefined;
  return `${new URL(base).origin}/tx/${hash}`;
}
export const publicAddress = (value: string): Address => address.parse(value);
