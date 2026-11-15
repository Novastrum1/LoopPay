import { it, expect } from "vitest";
const state = {
  chain: 1983,
  code: "0x1234" as `0x${string}`,
  name: "TEST ONLY Loop Dollar",
  symbol: "TESTUSD",
  decimals: 6,
};
const clientFor = () => ({
  getChainId: async () => state.chain,
  getCode: async () => state.code,
  readContract: async ({
    functionName,
  }: {
    functionName: "name" | "symbol" | "decimals";
  }) => state[functionName],
});
import { readiness } from "../../../scripts/qie-readiness";
const env = () => ({
  QIE_ENVIRONMENT: "testnet",
  NEXT_PUBLIC_CHAIN_ID: "1983",
  QIE_TESTNET_RPC_URL: "https://rpc1testnet.qie.digital/",
  NEXT_PUBLIC_RPC_URL: "https://rpc1testnet.qie.digital/",
  NEXT_PUBLIC_EXPLORER_URL: "https://testnet.qie.digital/",
  NEXT_PUBLIC_TOKEN_SYMBOL: "TESTUSD",
  NEXT_PUBLIC_TOKEN_DECIMALS: "6",
  QIE_ALLOW_TEST_TOKEN: "true",
  QIE_VERIFICATION_WORKFLOW_CONFIRMED: "true",
  ...Object.fromEntries(
    ["REGISTRY", "CHECKOUT", "REWARDS", "STABLECOIN"].map((key, i) => [
      `NEXT_PUBLIC_${key}_ADDRESS`,
      `0x${String(i + 1).padStart(40, "0")}`,
    ]),
  ),
});
it("requires explicit testnet mock acceptance and exact metadata", async () => {
  expect(
    (await readiness(env(), false, clientFor)).checks.filter((c) => !c.ok),
  ).toEqual([]);
  expect(
    (
      await readiness(
        { ...env(), QIE_ALLOW_TEST_TOKEN: "false" },
        false,
        clientFor,
      )
    ).ready,
  ).toBe(false);
  expect(
    (
      await readiness(
        { ...env(), NEXT_PUBLIC_TOKEN_DECIMALS: "18" },
        false,
        clientFor,
      )
    ).ready,
  ).toBe(false);
});
it("rejects incorrect RPC chain and absent bytecode", async () => {
  state.chain = 1;
  expect((await readiness(env())).ready).toBe(false);
  state.chain = 1983;
  state.code = "0x";
  expect((await readiness(env())).ready).toBe(false);
  state.code = "0x1234";
});
it("permits unset deployment addresses only in testnet pre-deploy mode", async () => {
  const preflight = {
    ...env(),
    ...Object.fromEntries(
      ["REGISTRY", "CHECKOUT", "REWARDS", "STABLECOIN"].map((key) => [
        `NEXT_PUBLIC_${key}_ADDRESS`,
        "",
      ]),
    ),
  };
  expect(
    (await readiness(preflight, true, clientFor)).checks.filter((c) => !c.ok),
  ).toEqual([]);
  expect((await readiness(preflight, false, clientFor)).ready).toBe(false);
});
it("never makes mainnet ready for a mock or without verification and approval", async () => {
  state.chain = 1990;
  const mainnet = {
    ...env(),
    QIE_ENVIRONMENT: "mainnet",
    NEXT_PUBLIC_CHAIN_ID: "1990",
    QIE_MAINNET_RPC_URL: "https://rpc1mainnet.qie.digital/",
    NEXT_PUBLIC_RPC_URL: "https://rpc1mainnet.qie.digital/",
    NEXT_PUBLIC_EXPLORER_URL: "https://mainnet.qie.digital/",
    QIE_TOKEN_OFFICIAL_SOURCE_CONFIRMED: "true",
  };
  expect((await readiness(mainnet, false, clientFor)).mainnetReady).toBe(false);
  expect(
    (
      await readiness(
        {
          ...mainnet,
          QIE_SOURCE_VERIFICATION_CONFIRMED: "true",
          QIE_RELEASE_APPROVED: "true",
        },
        false,
        clientFor,
      )
    ).mainnetReady,
  ).toBe(false);
  state.chain = 1983;
});
it("rejects zero addresses and redacts credential-bearing configuration", async () => {
  const config = {
    ...env(),
    NEXT_PUBLIC_REGISTRY_ADDRESS: `0x${"0".repeat(40)}`,
    QIE_TESTNET_RPC_URL:
      "https://user:fixture-password@example.invalid/?credential=fixture",
  };
  const report = await readiness(config, false, clientFor);
  expect(report.ready).toBe(false);
  expect(JSON.stringify(report)).not.toMatch(
    /fixture|password|example.invalid/,
  );
});
