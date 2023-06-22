const hre = require("hardhat");

async function main() {
    var abi = ["function reveal(bytes32,bytes32)"];
    var iface = new ethers.utils.Interface(abi);
    var id = iface.getSighash("reveal");

    const [owner] = await ethers.getSigners();
    console.log("Address", owner.address);

    console.log(id);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
