import {
  createPublicClient,
  http,
  erc20Abi,
  isAddress,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {
  /* environment is optional */
}
type ReadinessClient = {
  getChainId(): Promise<number>;
  getCode(input: { address: Address }): Promise<Hex | undefined>;
  readContract(input: {
    address: Address;
    abi: typeof erc20Abi;
    functionName: "name" | "symbol" | "decimals";
  }): Promise<string | number>;
};
const publicClientFor = (rpc: string): ReadinessClient =>
  createPublicClient({
    transport: http(rpc, { timeout: 10000, retryCount: 0 }),
  });
export async function readiness(
  env: Record<string, string | undefined>,
  preDeploy = false,
  clientFor = publicClientFor,
) {
  const checks: { check: string; ok: boolean }[] = [];
  const record = (check: string, ok: boolean) => checks.push({ check, ok });
  const target = env.QIE_ENVIRONMENT;
  const expectedChain =
    target === "testnet" ? 1983 : target === "mainnet" ? 1990 : 0;
  record("explicit testnet/mainnet environment", expectedChain !== 0);
  record("pre-deploy mode is testnet only", !preDeploy || target === "testnet");
  record(
    "configured chain",
    Number(env.NEXT_PUBLIC_CHAIN_ID) === expectedChain && expectedChain !== 0,
  );
  const rpc =
    target === "testnet" ? env.QIE_TESTNET_RPC_URL : env.QIE_MAINNET_RPC_URL;
  let rpcValid = false;
  try {
    const url = new URL(rpc ?? "");
    rpcValid =
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search;
  } catch {
    /* no raw errors */
  }
  record("HTTPS RPC without embedded credentials", rpcValid);
  const explorer =
    target === "testnet"
      ? "https://testnet.qie.digital"
      : "https://mainnet.qie.digital";
  record(
    "official explorer",
    env.NEXT_PUBLIC_EXPLORER_URL?.replace(/\/$/, "") === explorer,
  );
  record(
    "official token identity confirmation",
    env.QIE_TOKEN_OFFICIAL_SOURCE_CONFIRMED === "true" ||
      (target === "testnet" && env.QIE_ALLOW_TEST_TOKEN === "true"),
  );
  if (!preDeploy)
    record(
      "source verification workflow confirmed",
      env.QIE_VERIFICATION_WORKFLOW_CONFIRMED === "true",
    );
  const client = rpcValid ? clientFor(rpc!) : null;
  let connected = false;
  if (client) {
    try {
      connected = (await client.getChainId()) === expectedChain;
    } catch {
      /* redact transport */
    }
  }
  record("RPC chain match", connected);
  for (const key of [
    "REGISTRY",
    "CHECKOUT",
    "REWARDS",
    "STABLECOIN",
  ] as const) {
    const value = env[`NEXT_PUBLIC_${key}_ADDRESS`];
    if (
      !value &&
      preDeploy &&
      (key !== "STABLECOIN" || env.QIE_ALLOW_TEST_TOKEN === "true")
    )
      continue;
    const valid =
      !!value && isAddress(value) && value.toLowerCase() !== zeroAddress;
    record(`${key} address`, valid);
    let code = false;
    if (valid && connected && client) {
      try {
        const bytes = await client.getCode({ address: value });
        code = !!bytes && bytes !== "0x";
      } catch {
        /* redact */
      }
    }
    record(`${key} bytecode`, code);
    if (key === "STABLECOIN" && code && client && valid) {
      try {
        const read = (functionName: "name" | "symbol" | "decimals") =>
          client.readContract({ address: value, abi: erc20Abi, functionName });
        const [name, symbol, decimals] = await Promise.all([
          read("name"),
          read("symbol"),
          read("decimals"),
        ]);
        record(
          "token metadata matches configuration",
          !!name &&
            symbol === env.NEXT_PUBLIC_TOKEN_SYMBOL &&
            String(decimals) === env.NEXT_PUBLIC_TOKEN_DECIMALS,
        );
        const mock = /mock|test only|loop dollar/i.test(String(name));
        record(
          "mock token gate",
          !mock ||
            (target === "testnet" &&
              env.QIE_ALLOW_TEST_TOKEN === "true" &&
              symbol === "TESTUSD"),
        );
      } catch {
        record("readable token metadata", false);
      }
    }
  }
  let browserChain = false;
  try {
    const url = new URL(env.NEXT_PUBLIC_RPC_URL ?? "");
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search
    ) {
      browserChain = (await clientFor(url.href).getChainId()) === expectedChain;
    }
  } catch {
    /* redact */
  }
  record("public browser RPC chain match", browserChain);
  if (target === "mainnet") {
    record(
      "source verification evidence confirmed",
      env.QIE_SOURCE_VERIFICATION_CONFIRMED === "true",
    );
    record(
      "explicit human release approval",
      env.QIE_RELEASE_APPROVED === "true",
    );
  }
  const mainnetReady =
    target === "mainnet" &&
    checks.every((c) => c.ok) &&
    env.QIE_SOURCE_VERIFICATION_CONFIRMED === "true" &&
    env.QIE_RELEASE_APPROVED === "true";
  return {
    stage: preDeploy ? "pre-deploy" : "deployed",
    environment:
      target === "testnet" || target === "mainnet" ? target : "unset",
    checks,
    ready: checks.every((c) => c.ok),
    mainnetReady,
    readOnly: true,
    deploymentPerformed: false,
  };
}
if (process.argv[1]?.endsWith("qie-readiness.ts")) {
  try {
    const report = await readiness(
      process.env,
      process.argv.includes("--pre-deploy"),
    );
    console.info(JSON.stringify(report, null, 2));
    if (
      !report.ready ||
      (report.environment === "mainnet" && !report.mainnetReady)
    )
      process.exitCode = 1;
  } catch {
    console.error(
      "Readiness unavailable; inspect configuration locally. Connection details suppressed.",
    );
    process.exitCode = 1;
  }
}
