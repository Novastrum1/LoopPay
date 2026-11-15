# Wallet and payment QA

Status: real QIE Wallet desktop/mobile validation pending. wagmi uses the injected connector with EIP-6963 discovery. No proprietary SDK, official support certification or mobile deep-link integration is claimed. `/wallet` lists available connectors, current/required chain and switch action. If injection is absent, use a compatible extension or wallet browser; manual network setup may be required.

Record wallet version, device, OS, browser, chain, timestamp, result, screenshot and public transaction hash for every case. Use test-only wallets and faucet gas. Never include keys, recovery words, credentials or wallet balance screenshots containing unrelated accounts.

| Case                                 | Expected result                                                                       | Observed evidence      |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------- |
| Desktop QIE Wallet                   | Discovery, connection, chain switch, approval/payment and receipt                     | Pending                |
| Mobile QIE Wallet                    | Injected wallet browser discovery and complete payment; deep-link status explicit     | Pending                |
| MetaMask/another injected EVM wallet | Discovery, consent, payment and reward redemption                                     | Pending real-device QA |
| Multiple injected providers          | User can choose listed connector on wallet page                                       | Pending                |
| Wrong chain / rejected switch        | Writes blocked until chain matches; actionable error                                  | Pending                |
| Rejected approval                    | No payment/receipt; retry possible                                                    | Pending                |
| Rejected payment                     | Invoice stays open; approval alone not settlement                                     | Pending                |
| Insufficient token / gas             | Simulation or wallet error; no success claim                                          | Pending                |
| Expired/cancelled invoice            | Payment rejected                                                                      | Pending                |
| Token mismatch/revoked token         | Checkout disabled or transaction rejected                                             | Pending                |
| Revert / failed transaction          | Failure shown, no fabricated receipt                                                  | Pending                |
| Two confirmations / explorer         | Receipt event matches invoice and deployed contract                                   | Pending                |
| Open/self/test/identity-required     | Eligibility explanation precedes payment; contract rules enforced                     | Pending                |
| Pause/end/close                      | Earning stops; previously earned credits redeem                                       | Pending                |
| Refund                               | Owner only, amount <= unreserved, end/close required                                  | Pending                |
| Keyboard and mobile                  | Visible focus, labelled controls, no horizontal overflow, readable transaction review | Pending                |

Automated local injected-provider tests validate application mechanics; they do not establish QIE Wallet compatibility.
