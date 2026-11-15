import type { Address } from "viem";
export type VerificationStatus =
  "not-configured" | "verified" | "unverified" | "unavailable";
export interface IdentityProvider {
  isConfigured(): boolean;
  getVerificationStatus(address: Address): Promise<VerificationStatus>;
  verifyChallenge(
    address: Address,
    proof: unknown,
  ): Promise<VerificationStatus>;
}
/** No official verification API/contract has been confirmed. Never accepts caller assertions as proof. */
export class DisabledIdentityProvider implements IdentityProvider {
  isConfigured() {
    return false;
  }
  async getVerificationStatus(_address: Address): Promise<VerificationStatus> {
    return "not-configured";
  }
  async verifyChallenge(
    _address: Address,
    _proof: unknown,
  ): Promise<VerificationStatus> {
    return "not-configured";
  }
}
export const identityProvider: IdentityProvider =
  new DisabledIdentityProvider();
