import {
  createPublicClient,
  createWalletClient,
  http,
  decodeEventLog,
  parseAbi,
} from "viem";
import { loadNetwork, chainFor } from "@looppay/config";
import {
  LoopPaySDK,
  registryAbi,
  rewardsAbi,
  checkoutAbi,
  hashOrder,
} from "../src";
const network = loadNetwork(process.env);
if (network.chainId !== 31337) throw new Error("Local unlocked Anvil only");
const chain = chainFor(network);
const publicClient = createPublicClient({
  chain,
  transport: http(network.rpcUrl),
});
const walletBase = createWalletClient({
  chain,
  transport: http(network.rpcUrl),
});
const [account] = await walletBase.getAddresses();
const wallet = createWalletClient({
  account,
  chain,
  transport: http(network.rpcUrl),
});
const sdk = new LoopPaySDK(network, publicClient, wallet);
async function idFor(hash: Promise<`0x${string}`>, name: string, key: string) {
  const receipt = await sdk.confirmed(await hash);
  for (const log of receipt.logs) {
    try {
      const e = decodeEventLog({
        abi: [...registryAbi, ...rewardsAbi, ...checkoutAbi],
        data: log.data,
        topics: log.topics,
      });
      if (e.eventName === name)
        return BigInt(String((e.args as Record<string, unknown>)[key]));
    } catch {
      continue;
    }
  }
  throw new Error("Missing event");
}
let merchant = await sdk.getMerchantId(account);
if (merchant === 0n)
  merchant = await idFor(
    sdk.createMerchant(
      account,
      JSON.stringify({
        name: "Anvil Corner Shop",
        logo: "",
        category: "Cafe",
        country: "Local",
        location: "Anvil",
        payout: account,
        terms:
          "TEST ONLY. Redeem non-transferable credits at opted-in local partners.",
      }),
    ),
    "MerchantCreated",
    "merchantId",
  );
const mockAbi = parseAbi([
  "function mint(address to,uint256 amount)",
  "function name() view returns (string)",
]);
if (
  (await publicClient.readContract({
    address: network.token,
    abi: mockAbi,
    functionName: "name",
  })) !== "TEST ONLY Loop Dollar"
)
  throw new Error("Refusing to mint an unknown token");
await sdk.confirmed(
  await wallet.writeContract({
    address: network.token,
    abi: mockAbi,
    functionName: "mint",
    args: [account, 1000_000000n],
  }),
);
const now = BigInt(Math.floor(Date.now() / 1000));
const campaign = await idFor(
  sdk.createCampaign({
    merchantId: merchant,
    token: network.token,
    bps: 500n,
    minPurchase: 0n,
    cap: 10_000000n,
    start: now,
    end: now + 86400n,
  }),
  "CampaignCreated",
  "campaignId",
);
await sdk.confirmed(
  await sdk.approve(network.token, network.rewards, 100_000000n),
);
await sdk.confirmed(await sdk.fundCampaign(campaign, 100_000000n));
await sdk.confirmed(await sdk.optInToPartnerNetwork(merchant, true));
const invoice = await idFor(
  sdk.createInvoice({
    merchantId: merchant,
    token: network.token,
    amount: 24_000000n,
    orderReferenceHash: hashOrder("local-demo"),
    expiresAt: now + 3600n,
    campaignId: campaign,
  }),
  "InvoiceCreated",
  "invoiceId",
);
console.info(
  `Local merchant ${merchant}, campaign ${campaign}, invoice ${invoice}. Open ${process.env.APP_URL}/pay/${invoice}`,
);
