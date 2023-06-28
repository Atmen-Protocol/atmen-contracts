## V1

-   batch open swaps together - probably not needed
-   implement more fee options - probably not needed
-   validate info sent to server from frontend: timelock is valid
-   write tests
-   write redeem part in UI
-   improve error handling if transaction fails
-   general improvements to UI, allow to specify commitment and see all open swaps related to address
    -   First request offer, then confirm offer, etc
-   Contract:
    -   check that secret is non 0
    -   check that value is greater than a certain minimum that guarantees that userOp fees will be paid. Not so trivial

## V2

-   Introduce DH-like secret sharing to calculate shared secret. This avoid MITM attacks and facilitates introducing a tool to exchange secrets P2P, without having to trust a central server. For instance, somethin similar to stealth accounts. This also solves legal issues in that we can only send (privately) to random receiving addresses, ensuring that the user has the private key for it.
-   Investigate using ZKproofs instead of Schnorr, or maybe polynomial commitments.
-   Bridge to non-evm chains; Lisk done
-   Implement own bundler; done, must fix mistakes
-   everyone closes with userOp, close with transaction is only security measure
-   implement close several userOps at once
-   separate bundler address from provider
-   provider uses a pool of addresses not only one
-   close with trs: no extra fee cost
-   close with userOp: pay max fixed fee cost. Fix maxPriorityFeePerGas in verification, calculate userOp.gasPrice() and use max possible gas used (to be found)
-   several options for commitment type (hash, polynomial, etc) when opening swap

## Possible Ideas

-   We can force users to send to a new address by subtracting the secret revealed from the recipient address given in the swap. In this way, a user is forced to change address as the original sending address is public.
-   In reality, the mirror swap does not even need to have a recipient address set, could be left open. This mean the recipient is not known until very end, but it also breaks the symmetry and identifies mirror swap as such.
-   Add function to close several swaps with a single userOp. Possibly aggregate "signatures" (use an aggregator, that would be super cool actually). It should be possible to just "multiply" the secrets together and sum the commitments. Check if it is possible or not (maybe only one userOp per wallet contract per transaction forbids this). Before multiplying we need to hash the secret (so protocol change), otherwise one can reveal wrong secrets which conserve the sum. NOTE: does not work because we need linearity for the secret recovery, anyway, see: https://eips.ethereum.org/EIPS/eip-197

## Vision

-   we write an EIP where we standardize the AtomicRevealer interface. Cloak is just an application where we move tokens after revealing a secret. In genera;, we can have a callback trigger on a secret revelation.
