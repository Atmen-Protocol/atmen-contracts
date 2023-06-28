const hre = require("hardhat");
async function main() {
    const [signer, deployer] = await ethers.getSigners();
    const chainId = await signer.getChainId();
    console.log("deploying on chain", chainId);

    const params =
        chainId === 420
            ? {
                  maxFeePerGas: 10000000000,
                  gasLimit: 5000000,
              }
            : {
                  gasPrice: 6000000000,
                  gasLimit: 5000000,
              };
    console.log("deploying on", hre.network.name, "with params", params);
    // send eth to deployer
    // const trs = await signer.sendTransaction({
    //     to: deployer.address,
    //     value: ethers.utils.parseEther("0.4"),
    //     ...params,
    // });

    // await trs.wait();
    console.log("deployer ready");

    const ECCommitment = await ethers.getContractFactory("ECCommitment");
    const ecCommitment = await ECCommitment.attach(
        "0xfcFC94848A98079F7432d87d99C6a2c66F85f6c5"
    );
    console.log("ECC:", ecCommitment.address);

    const AtmenSwap = await ethers.getContractFactory("AtmenSwap", {
        libraries: { ECCommitment: ecCommitment.address },
    });

    const deployTrs = await AtmenSwap.connect(deployer).deploy(
        process.env.ENTRY_POINT_ADDRESS,
        params
    );
    console.log("ATMEWSWAP:", deployTrs.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
