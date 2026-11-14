import assert from "node:assert/strict";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  toBytes,
} from "viem";
import { loadNetwork, chainFor } from "@looppay/config";
import { LoopPaySDK } from "../src";
const n = loadNetwork(process.env);
assert.equal(n.chainId, 31337, "Local integration only");
const chain = chainFor(n);
const publicClient = createPublicClient({ chain, transport: http(n.rpcUrl) });
const base = createWalletClient({ chain, transport: http(n.rpcUrl) });
const accounts = await base.getAddresses();
const make = (index: number) =>
  new LoopPaySDK(
    n,
    publicClient,
    createWalletClient({
      account: accounts[index],
      chain,
      transport: http(n.rpcUrl),
    }),
  );
const merchant = make(0),
  partner = make(1),
  customer = make(2);
const mock = parseAbi([
  "function mint(address,uint256)",
  "function balanceOf(address) view returns(uint256)",
]);
const confirmed = (hash: Promise<`0x${string}`>) =>
  hash.then((h) => merchant.confirmed(h));
let partnerId = await partner.getMerchantId(accounts[1]);
if (partnerId === 0n) {
  await confirmed(
    partner.createMerchant(
      accounts[1],
      JSON.stringify({
        name: "Local Partner",
        logo: "",
        category: "Books",
        location: "Anvil",
        country: "Local",
        payout: accounts[1],
        terms: "TEST ONLY partner reward redemption.",
      }),
    ),
  );
  partnerId = await partner.getMerchantId(accounts[1]);
}
await confirmed(partner.optInToPartnerNetwork(partnerId, true));
await confirmed(
  createWalletClient({
    account: accounts[0],
    chain,
    transport: http(n.rpcUrl),
  }).writeContract({
    address: n.token,
    abi: mock,
    functionName: "mint",
    args: [accounts[2], 100_000000n],
  }),
);
const mid = await merchant.getMerchantId(accounts[0]);
const now = BigInt(Math.floor(Date.now() / 1000));
await confirmed(
  merchant.createInvoice({
    merchantId: mid,
    token: n.token,
    amount: 20_000000n,
    orderReferenceHash: keccak256(toBytes(crypto.randomUUID())),
    expiresAt: now + 3600n,
    campaignId: 1n,
  }),
);
const { checkoutAbi } = await import("../src");
const id = await publicClient.readContract({
  address: n.checkout,
  abi: checkoutAbi,
  functionName: "invoiceCount",
});
const before = await publicClient.readContract({
  address: n.token,
  abi: mock,
  functionName: "balanceOf",
  args: [accounts[0]],
});
await confirmed(customer.approve(n.token, n.checkout, 20_000000n));
const rewardBefore = await customer.getBalance(1n, accounts[2]);
await confirmed(customer.payInvoice(id));
const after = await publicClient.readContract({
  address: n.token,
  abi: mock,
  functionName: "balanceOf",
  args: [accounts[0]],
});
assert.equal(after - before, 20_000000n, "Direct settlement");
assert.equal(
  await customer.getBalance(1n, accounts[2]),
  rewardBefore + 1_000000n,
  "5% earned",
);
await confirmed(merchant.pauseCampaign(1n, true));
await confirmed(
  customer.redeem(
    1n,
    partnerId,
    500000n,
    keccak256(toBytes(crypto.randomUUID())),
  ),
);
assert.equal(
  await customer.getBalance(1n, accounts[2]),
  rewardBefore + 500000n,
  "Paused campaign preserves redemption",
);
await confirmed(merchant.pauseCampaign(1n, false));
const balance = await publicClient.readContract({
  address: n.token,
  abi: mock,
  functionName: "balanceOf",
  args: [n.checkout],
});
assert.equal(balance, 0n, "No Checkout custody");
console.info(
  `PASS: direct payment, 5% reward, campaign pause, cross-merchant redemption, zero Checkout balance. Receipt invoice ${id}.`,
);
