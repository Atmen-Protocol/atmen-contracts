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

    const AtomicCloak = await ethers.getContractFactory("AtomicCloak", {
        libraries: { ECCUtils: eccUtils.address },
    });

    const cloackDeployTrs = await AtomicCloak.connect(deployer).deploy(
        process.env.ENTRY_POINT_ADDRESS,
        { gasPrice: 2000000000 }
    );
    console.log(cloackDeployTrs.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
