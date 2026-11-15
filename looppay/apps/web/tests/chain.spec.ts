import { test, expect, type BrowserContext } from "@playwright/test";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
  decodeEventLog,
} from "viem";
import { anvil } from "viem/chains";
import { registryAbi, LoopPaySDK, rewardsAbi, checkoutAbi } from "@looppay/sdk";
import { loadNetwork, chainFor } from "@looppay/config";
import { loadEnvFile } from "node:process";
const enabled = process.env.LOOPPAY_E2E_CHAIN === "true";
if (enabled) loadEnvFile("../../.env");
async function inject(context: BrowserContext, account: string, rpc: string) {
  await context.addInitScript(
    ({ account, rpc }) => {
      const provider = {
        isMetaMask: true,
        on: () => {},
        removeListener: () => {},
        request: async ({
          method,
          params,
        }: {
          method: string;
          params?: unknown[];
        }) => {
          if (method === "eth_accounts" || method === "eth_requestAccounts")
            return [account];
          if (method === "wallet_switchEthereumChain") return null;
          const response = await fetch(rpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method,
              params: params ?? [],
            }),
          });
          const data = await response.json();
          if (data.error)
            throw Object.assign(new Error(data.error.message), {
              code: data.error.code,
            });
          return data.result;
        },
      };
      Object.defineProperty(window, "ethereum", { value: provider });
    },
    { account, rpc },
  );
}
test("connected merchant creates QR invoice; customer approves, pays and receives confirmed receipt", async ({
  browser,
  page,
}) => {
  expect(enabled, "Chain flow requires explicit local integration mode").toBe(
    true,
  );
  test.setTimeout(180000);
  const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
  const token = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS as `0x${string}`;
  const publicClient = createPublicClient({
    chain: anvil,
    transport: http(rpc),
  });
  expect(await publicClient.getChainId()).toBe(31337);
  const wallet = createWalletClient({ chain: anvil, transport: http(rpc) });
  const accounts = await wallet.getAddresses();
  const mock = parseAbi(["function mint(address,uint256)"]);
  const beforeBalance = await publicClient.readContract({
    address: token,
    abi: parseAbi(["function balanceOf(address) view returns(uint256)"]),
    functionName: "balanceOf",
    args: [accounts[4]],
  });
  const hash = await wallet.writeContract({
    account: accounts[0],
    address: token,
    abi: mock,
    functionName: "mint",
    args: [accounts[5], 100_000000n],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  const existingMerchant = await publicClient.readContract({
    address: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`,
    abi: registryAbi,
    functionName: "merchantOf",
    args: [accounts[4]],
  });
  await inject(page.context(), accounts[4], rpc);
  await page.goto("/merchant");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();
  await expect(page.getByText("Loading your merchant profile…")).toHaveCount(0);
  if (existingMerchant === 0n) {
    await expect(
      page.getByRole("button", { name: "Save merchant profile" }),
    ).toBeEnabled();
    await page.getByLabel("Business name").fill("Browser Neighborhood Shop");
    await page.getByLabel("Category", { exact: true }).fill("Coffee");
    await page.getByLabel("Country", { exact: true }).fill("Local");
    await page.getByLabel("Payout wallet").fill(accounts[4]);
    await page.getByRole("button", { name: "Save merchant profile" }).click();
    await expect(
      page.getByText("Transaction confirmed.", { exact: false }),
    ).toBeVisible({ timeout: 30000 });
  } else {
    await expect(
      page.getByText(`Profile #${existingMerchant}`, { exact: false }),
    ).toBeVisible();
  }
  await page.goto("/merchant/invoices/new");
  await page.getByLabel("Short description").fill("USD · Browser order");
  await page.getByLabel("Amount (TESTUSD)", { exact: true }).fill("3");
  await page.getByLabel("Order reference").fill(`browser-${Date.now()}`);
  const expiry = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  await page.getByLabel("Invoice expiry").fill(expiry);
  // Campaign zero is intentional: browser test proves direct checkout; SDK integration separately proves rewards.
  await page
    .getByRole("button", { name: "Create invoice", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Download QR code" }),
  ).toBeVisible({ timeout: 30000 });
  const invoiceURL = await page.locator("a.link-break").getAttribute("href");
  expect(invoiceURL).toContain("/pay/");
  const customerContext = await browser.newContext();
  await inject(customerContext, accounts[5], rpc);
  const customer = await customerContext.newPage();
  await customer.goto(invoiceURL!);
  await customer.getByRole("button", { name: "Connect wallet" }).click();
  await customer.getByRole("button", { name: "Approve stablecoin" }).click();
  await expect(
    customer.getByRole("button", { name: "Pay invoice", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await customer
    .getByRole("button", { name: "Pay invoice", exact: true })
    .click();
  await customer
    .getByRole("button", { name: "Confirm payment", exact: true })
    .click();
  await expect(customer).toHaveURL(/\/receipt\//, { timeout: 30000 });
  await expect(
    customer.getByText("Payment receipt confirmed.", { exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    customer.getByText("Earned 0 TESTUSD in loyalty credits."),
  ).toBeVisible();
  const balance = await publicClient.readContract({
    address: token,
    abi: parseAbi(["function balanceOf(address) view returns(uint256)"]),
    functionName: "balanceOf",
    args: [accounts[4]],
  });
  expect(formatUnits(balance - beforeBalance, 6)).toBe("3");
  await customerContext.close();
});

test("merchant closes campaign and refunds unreserved funds while customer keeps earned credits", async ({
  page,
}) => {
  test.setTimeout(180000);
  const n = loadNetwork(process.env);
  expect(n.chainId).toBe(31337);
  const chain = chainFor(n);
  const publicClient = createPublicClient({ chain, transport: http(n.rpcUrl) });
  const wallet = createWalletClient({ chain, transport: http(n.rpcUrl) });
  const accounts = await wallet.getAddresses();
  const sdkFor = (index: number) =>
    new LoopPaySDK(
      n,
      publicClient,
      createWalletClient({
        account: accounts[index],
        chain,
        transport: http(n.rpcUrl),
      }),
    );
  const merchant = sdkFor(6),
    customer = sdkFor(7);
  const confirm = async (hash: Promise<`0x${string}`>) =>
    merchant.confirmed(await hash);
  let merchantId = await merchant.getMerchantId(accounts[6]);
  if (!merchantId) {
    await confirm(
      merchant.createMerchant(
        accounts[6],
        JSON.stringify({
          name: "Refund QA shop",
          logo: "",
          category: "Cafe",
          country: "Local",
          location: "Anvil",
          payout: accounts[6],
          terms: "Test only non-transferable rewards.",
        }),
      ),
    );
    merchantId = await merchant.getMerchantId(accounts[6]);
  }
  const mint = parseAbi(["function mint(address,uint256)"]);
  for (const index of [6, 7])
    await publicClient.waitForTransactionReceipt({
      hash: await wallet.writeContract({
        account: accounts[0],
        address: n.token,
        abi: mint,
        functionName: "mint",
        args: [accounts[index], 10_000000n],
      }),
    });
  const now = BigInt(Math.floor(Date.now() / 1000));
  const receipt = await confirm(
    merchant.createCampaign({
      merchantId,
      token: n.token,
      bps: 1000n,
      minPurchase: 0n,
      cap: 10_000000n,
      start: now,
      end: now + 86400n,
    }),
  );
  let campaignId = 0n;
  for (const log of receipt.logs) {
    try {
      const e = decodeEventLog({
        abi: rewardsAbi,
        data: log.data,
        topics: log.topics,
      });
      if (e.eventName === "CampaignCreated") campaignId = e.args.campaignId;
    } catch {
      /* other events */
    }
  }
  expect(campaignId).toBeGreaterThan(0n);
  await confirm(merchant.approve(n.token, n.rewards, 10_000000n));
  await confirm(merchant.fundCampaign(campaignId, 10_000000n));
  const invoiceReceipt = await confirm(
    merchant.createInvoice({
      merchantId,
      token: n.token,
      amount: 2_000000n,
      orderReferenceHash: `0x${"0".repeat(64)}`,
      expiresAt: now + 3600n,
      campaignId,
    }),
  );
  let invoiceId = 0n;
  for (const log of invoiceReceipt.logs) {
    try {
      const e = decodeEventLog({
        abi: checkoutAbi,
        data: log.data,
        topics: log.topics,
      });
      if (e.eventName === "InvoiceCreated") invoiceId = e.args.invoiceId;
    } catch {
      /* other event */
    }
  }
  expect(invoiceId).toBeGreaterThan(0n);
  await confirm(customer.approve(n.token, n.checkout, 2_000000n));
  await confirm(customer.payInvoice(invoiceId));
  expect(await customer.getBalance(campaignId, accounts[7])).toBe(200000n);
  await inject(page.context(), accounts[6], n.rpcUrl);
  await page.goto("/merchant/campaigns");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  const refund = page.getByRole("region", { name: "Campaign refunds" });
  await refund
    .getByLabel("Campaign ID", { exact: true })
    .fill(campaignId.toString());
  await expect(refund.getByText(/Unreserved: 9.8 TESTUSD/)).toBeVisible();
  await expect(
    refund.getByRole("button", { name: "Permanently close campaign" }),
  ).toBeDisabled();
  await refund.getByLabel("I understand closure is permanent.").check();
  await refund
    .getByRole("button", { name: "Permanently close campaign" })
    .click();
  await expect(refund.getByText(/Status: Closed/)).toBeVisible({
    timeout: 30000,
  });
  await refund.getByLabel("Refund amount (TESTUSD)").fill("10");
  await refund
    .getByRole("button", { name: "Review and withdraw in wallet" })
    .click();
  await expect(refund.getByRole("alert")).toContainText("exceeds unreserved");
  await refund.getByLabel("Refund amount (TESTUSD)").fill("9.8");
  await refund
    .getByRole("button", { name: "Review and withdraw in wallet" })
    .click();
  await expect(refund.getByText(/Unreserved: 0 TESTUSD/)).toBeVisible({
    timeout: 30000,
  });
  expect(await customer.getBalance(campaignId, accounts[7])).toBe(200000n);
  const campaign = await merchant.getCampaign(campaignId);
  expect(campaign[5]).toBe(200000n);
  expect(campaign[6]).toBe(200000n);
});
