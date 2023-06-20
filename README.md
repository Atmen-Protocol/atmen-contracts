<p align="center">
  <img src="app/public/images/logo.png">
</p>

**_Atomic Cloak._** _Mixer-style privacy preserving cross-chain atomic swaps. Withdraw ETH and ERC-20 from L2 anonymously and instantly via a liquidity provider._

## Specification

### Cryptography

The privacy and atomicity of Atomic Cloak relies on the [discrete log problem](https://en.wikipedia.org/wiki/Discrete_logarithm), the same cryptography that protects Ethereum secret keys. The protocol is similar to Schnorr signature with an empty message hash.

0. Alice and Bob agree for a swap.
1. Alice chooses a secret key $s_A \in Z^*_q$ and computes $Q_A = G^{s_A}$, where $G$ is the generator of `secp256k1` elliptic curve group. Note that $s_A$ can not be recoveref from $Q_A$.
2. Alice creates an atomic swap with Bob by locking tokens in a contract. Tokens can be withdrawn:
    - either by Bob after presenting $s_A$, or
    - after timeout period by Alice.
3. Alice generates random $z\in Z^*_q$ and sends it together with her preferred receiving address to Bob.
4. Bob computes $Q_B = Q_A G^z$ and creates an atomic swap with Alice's receiving address. The timeout must be shorter than on Alice's contract.
5. At this point Alice can compute $Q_B$ and withdraw from Bob's contract by presenting $s_B = s_A + z$, since $G^{s_B} = Q_B$. In doing so, she reveals $s_B$.
6. Bob can now compute $s_A = s_B - z$ and withdraw from Alice's contract.

# Deployments

UI is deployed at https://cloak.frittura.org/.

The instance of Atomic Cloak smart contract is deployed on following networks (to be updated):

| Networks              | Address                                                                                                                                 | UI support for recipient chain    | Close swap with UserOp in UI      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| sepolia               | [`0x6a18426245F240B95378a43769b5688B9794875b`](https://sepolia.etherscan.io/address/0x6a18426245F240B95378a43769b5688B9794875b)         | $\textcolor{green}{\textbf{Yes}}$ | $\textcolor{red}{\textbf{No}}$    |
| mumbai                | [`0xcE250A659fc1090714c2810ec091F7BB95D27eb4`](https://mumbai.polygonscan.com/address/0xce250a659fc1090714c2810ec091f7bb95d27eb4)       | $\textcolor{green}{\textbf{Yes}}$ | $\textcolor{green}{\textbf{Yes}}$ |
| optimism goerli       | [`0x272e066945678DeB96736a1904734cdFdFF074c6`](https://goerli-optimism.etherscan.io/address/0x272e066945678deb96736a1904734cdfdff074c6) | $\textcolor{green}{\textbf{Yes}}$ | $\textcolor{green}{\textbf{Yes}}$ |
| chiado gnosis testnet | [`0x52854bb581dfAB7cc3F94a38da727D39B757F187`](https://blockscout.com/gnosis/chiado/address/0x52854bb581dfAB7cc3F94a38da727D39B757F187) | $\textcolor{red}{\textbf{No}}$    | $\textcolor{red}{\textbf{No}}$    |
| zkSync era testnet    | [`0xF42d539FFd4A0Ef28aD9b04cF2a236d0a443F70E`](https://goerli.explorer.zksync.io/address/0xF42d539FFd4A0Ef28aD9b04cF2a236d0a443F70E)    | $\textcolor{red}{\textbf{No}}$    | $\textcolor{red}{\textbf{No}}$    |
| mantle                | [`0xC0E46AC8E2db831D0D634B8a9b0A5f32fB99c61d`](https://explorer.testnet.mantle.xyz/address/0xC0E46AC8E2db831D0D634B8a9b0A5f32fB99c61d)  | $\textcolor{red}{\textbf{No}}$    | $\textcolor{red}{\textbf{No}}$    |
| taiko                 | [`0x33d68CA687f49c2b6CEa605C1B4783652358c722`](https://explorer.test.taiko.xyz/address/0x33d68CA687f49c2b6CEa605C1B4783652358c722)      | $\textcolor{red}{\textbf{No}}$    | $\textcolor{red}{\textbf{No}}$    |
