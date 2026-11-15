import { expect, it } from "vitest";
import { DisabledIdentityProvider } from "../src/identity";
it("never accepts arbitrary identity assertions while integration is disabled", async () => {
  const provider = new DisabledIdentityProvider();
  const address = "0x0000000000000000000000000000000000000001";
  expect(provider.isConfigured()).toBe(false);
  expect(await provider.getVerificationStatus(address)).toBe("not-configured");
  expect(await provider.verifyChallenge(address, { verified: true })).toBe(
    "not-configured",
  );
});
