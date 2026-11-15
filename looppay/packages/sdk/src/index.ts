import {
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  erc20Abi,
  parseUnits,
  keccak256,
  toBytes,
} from "viem";
import { z } from "zod";
import { type NetworkConfig } from "@looppay/config";
import { checkoutAbi, registryAbi, rewardsAbi } from "./abi";
export { checkoutAbi, registryAbi, rewardsAbi } from "./abi";
export const amountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d+)?$/, "Use a positive decimal amount");
export function tokenAmount(value: string, decimals: number): bigint {
  amountSchema.parse(value);
  if ((value.split(".")[1]?.length ?? 0) > decimals)
    throw new Error("Too many decimal places");
  const amount = parseUnits(value, decimals);
  if (amount <= 0n) throw new Error("Amount must be positive");
  return amount;
}
export const hashOrder = (reference: string) => keccak256(toBytes(reference));
export interface InvoiceInput {
  merchantId: bigint;
  token: Address;
  amount: bigint;
  orderReferenceHash: Hash;
  expiresAt: bigint;
  campaignId: bigint;
  isTest?: boolean;
}
export interface CampaignInput {
  merchantId: bigint;
  token: Address;
  bps: bigint;
  minPurchase: bigint;
  cap: bigint;
  start: bigint;
  end: bigint;
  eligibility?: 0 | 1 | 2;
  selfPaymentProtection?: boolean;
}
export class LoopPaySDK {
  constructor(
    public readonly network: NetworkConfig,
    public readonly publicClient: PublicClient,
    public readonly wallet?: WalletClient,
  ) {}
  private async write(
    address: Address,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[],
  ) {
    const wallet = this.wallet;
    if (!wallet?.account) throw new Error("Connect wallet");
    if ((await wallet.getChainId()) !== this.network.chainId)
      throw new Error("Unsupported network");
    const { request } = await this.publicClient.simulateContract({
      address,
      abi,
      functionName,
      args,
      account: wallet.account,
      chain: wallet.chain,
    });
    return wallet.writeContract(
      request as Parameters<WalletClient["writeContract"]>[0],
    );
  }
  createMerchant(payout: Address, metadataURI: string) {
    return this.write(this.network.registry, registryAbi, "createMerchant", [
      payout,
      metadataURI,
    ]);
  }
  updateMerchant(id: bigint, payout: Address, metadataURI: string) {
    return this.write(this.network.registry, registryAbi, "updateMerchant", [
      id,
      payout,
      metadataURI,
    ]);
  }
  createInvoice(i: InvoiceInput) {
    return this.write(
      this.network.checkout,
      checkoutAbi,
      i.isTest ? "createTestInvoice" : "createInvoice",
      [
        i.merchantId,
        i.token,
        i.amount,
        i.orderReferenceHash,
        i.expiresAt,
        i.campaignId,
      ],
    );
  }
  payInvoice(id: bigint) {
    return this.write(this.network.checkout, checkoutAbi, "payInvoice", [id]);
  }
  cancelInvoice(id: bigint) {
    return this.write(this.network.checkout, checkoutAbi, "cancelInvoice", [
      id,
    ]);
  }
  createCampaign(c: CampaignInput) {
    return this.write(
      this.network.rewards,
      rewardsAbi,
      "createCampaignWithPolicy",
      [
        c.merchantId,
        c.token,
        c.bps,
        c.minPurchase,
        c.cap,
        c.start,
        c.end,
        c.eligibility ?? 0,
        c.selfPaymentProtection ?? true,
      ],
    );
  }
  fundCampaign(id: bigint, amount: bigint) {
    return this.write(this.network.rewards, rewardsAbi, "fundCampaign", [
      id,
      amount,
    ]);
  }
  optInToPartnerNetwork(id: bigint, value: boolean) {
    return this.write(
      this.network.rewards,
      rewardsAbi,
      "optInToPartnerNetwork",
      [id, value],
    );
  }
  pauseCampaign(id: bigint, value: boolean) {
    return this.write(this.network.rewards, rewardsAbi, "setCampaignPaused", [
      id,
      value,
    ]);
  }
  closeCampaign(id: bigint) {
    return this.write(this.network.rewards, rewardsAbi, "closeCampaign", [id]);
  }
  withdrawUnreservedFunds(id: bigint, amount: bigint, recipient: Address) {
    return this.write(
      this.network.rewards,
      rewardsAbi,
      "withdrawUnreservedFunds",
      [id, amount, recipient],
    );
  }
  setRewardPolicy(id: bigint, mode: 0 | 1 | 2, protectSelfPayments = true) {
    return this.write(this.network.rewards, rewardsAbi, "setRewardPolicy", [
      id,
      mode,
      protectSelfPayments,
    ]);
  }
  redeem(id: bigint, merchant: bigint, amount: bigint, redemptionId: Hash) {
    return this.write(this.network.rewards, rewardsAbi, "redeem", [
      id,
      merchant,
      amount,
      redemptionId,
    ]);
  }
  approve(token: Address, spender: Address, amount: bigint) {
    if (spender !== this.network.checkout && spender !== this.network.rewards)
      throw new Error("Invalid spender");
    return this.write(token, erc20Abi, "approve", [spender, amount]);
  }
  allowance(token: Address, owner: Address, spender: Address) {
    return this.publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
    });
  }
  getInvoice(id: bigint) {
    return this.publicClient.readContract({
      address: this.network.checkout,
      abi: checkoutAbi,
      functionName: "invoices",
      args: [id],
    });
  }
  getMerchant(id: bigint) {
    return this.publicClient.readContract({
      address: this.network.registry,
      abi: registryAbi,
      functionName: "merchants",
      args: [id],
    });
  }
  getMerchantId(owner: Address) {
    return this.publicClient.readContract({
      address: this.network.registry,
      abi: registryAbi,
      functionName: "merchantOf",
      args: [owner],
    });
  }
  getCampaign(id: bigint) {
    return this.publicClient.readContract({
      address: this.network.rewards,
      abi: rewardsAbi,
      functionName: "campaigns",
      args: [id],
    });
  }
  getBalance(id: bigint, owner: Address) {
    return this.publicClient.readContract({
      address: this.network.rewards,
      abi: rewardsAbi,
      functionName: "balances",
      args: [id, owner],
    });
  }
  async confirmed(hash: Hash) {
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 2,
    });
    if (receipt.status !== "success") throw new Error("Transaction reverted");
    return receipt;
  }
  async getMerchantAnalytics(base: string, id: bigint) {
    const response = await fetch(`${base}/api/analytics/${id}`);
    if (!response.ok) throw new Error("Analytics unavailable");
    return response.json() as Promise<MerchantAnalytics>;
  }
}
export interface MerchantAnalytics {
  grossPaymentCount?: number;
  eligiblePaymentCount?: number;
  rewardEarningPaymentCount?: number;
  excludedPaymentCount?: number;
  selfPaymentCount?: number;
  testPaymentCount?: number;
  grossVolume?: string;
  eligibleVolume?: string;
  withdrawn?: string;
  uniquePublicWalletAddresses?: number;
  repeatPublicWalletAddresses?: number;
  volume: string;
  paymentCount: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  activeCampaigns: number;
  fundsRemaining: string;
  rewardsEarned: string;
  redemptions: number;
  redemptionRate: string;
  indexedThrough: string;
  demo: boolean;
}
export { identityProvider, DisabledIdentityProvider } from "./identity";
export type { IdentityProvider, VerificationStatus } from "./identity";
