const hre = require("hardhat");
async function main() {
    const [signer, deployer] = await ethers.getSigners();

    //send eth to deployer
    const trs = await signer.sendTransaction({
        to: deployer.address,
        value: ethers.utils.parseEther("0.02"),
        gasPrice: 2000000000,
    });

    await trs.wait();

    const ECCUtils = await ethers.getContractFactory("ECCUtils");
    const eccUtils = await ECCUtils.connect(deployer).deploy({
        gasPrice: 2000000000,
    });

    const AtmenSwap = await ethers.getContractFactory("AtmenSwap", {
        libraries: { ECCUtils: eccUtils.address },
    });

    const deployTrs = await AtmenSwap.connect(deployer).deploy(
        process.env.ENTRY_POINT_ADDRESS,
        { gasPrice: 2000000000 }
    );
    console.log(deployTrs.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
