# QIE ID integration gate

Status: disabled, no verification claims. Official pages reviewed on 2026-11-15: [QIE ID](https://id.qie.digital/), [QIE Pass](https://qiepass.qie.digital/), [QIE products](https://www.qie.digital/products), and [QIE docs](https://docs.qie.digital/). These describe identity products; the reviewed material did not establish a developer verification contract, credential ABI, proof verification endpoint or challenge protocol. Owning a .qie name is not proof of verified identity. No endpoint, SDK or oracle has been guessed.

`packages/sdk/src/identity.ts` defines IdentityProvider: isConfigured, getVerificationStatus(address), verifyChallenge(address, proof). DisabledIdentityProvider always returns not-configured, even for a submitted object asserting verification. The wallet UI states that verification is not configured. The contract's QieIdVerified policy always returns ineligible in this version, so a frontend assertion cannot grant rewards. Payment stays possible. Enabling identity requires a reviewed contract change and fresh deployment; an environment flag alone cannot activate it.

Configuration and review checklist:

- Obtain official testnet and mainnet contract addresses or authenticated API spec, ABI/SDK version, source links and network bindings from QIE.
- Confirm what a verified credential means, its wallet binding, issuer authority, expiry and revocation semantics; distinguish name ownership from verification.
- Specify challenge nonce, domain, chain, audience, expiry, replay prevention and signature checks. Verify proof server-side or on-chain, never from a browser Boolean.
- Define an on-chain trusted verifier/attestation path. Off-chain provider responses alone cannot authorize on-chain earning.
- Define bounded verifier gas/timeout behavior; outages fail closed for rewards without reverting underlying purchases. No retroactive unreserved earning promises.
- Review privacy, consent and minimum retention. Store no identity documents, biometrics or personal profiling data in LoopPay.
- Add official fixtures, forged/replayed/revoked/expired proof tests, issuer-change and outage tests, and external security review before deployment.
- Record QIE support confirmation and owner sign-off in release evidence. Preserve open wallet mode and explain eligibility before approval.
