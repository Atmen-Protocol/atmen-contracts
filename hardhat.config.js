require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.18",
            },
            {
                version: "0.6.2",
            },
        ],
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            quiet: true,
        },
    },
    defaultNetwork: "hardhat",
    etherscan: {
        apiKey: {
            polygonMumbai: process.env.POLYGON_API_KEY,
            goerli: process.env.ETHERSCAN_API_KEY,
            sepolia: process.env.ETHERSCAN_API_KEY,
            optimisticGoerli: process.env.OPTIMISM_API_KEY,
        },
    },
    networks: {
        hardhat: {},
        polygonMumbai: {
            url: process.env.ENDPOINT_URL_MUMBAI,
            accounts: [
                process.env.BACKEND_PRIVATE_KEY,
                process.env.DEPLOYER_PRIVATE_KEY,
            ],
        },
        goerli: {
            url: process.env.ENDPOINT_URL_GOERLI,
            accounts: [
                process.env.BACKEND_PRIVATE_KEY,
                process.env.DEPLOYER_PRIVATE_KEY,
            ],
        },
        sepolia: {
            url: process.env.ENDPOINT_URL_SEPOLIA,
            accounts: [
                process.env.BACKEND_PRIVATE_KEY,
                process.env.DEPLOYER_PRIVATE_KEY,
            ],
        },
        optimisticGoerli: {
            url: process.env.ENDPOINT_URL_OPTIMISM_GOERLI,
            accounts: [
                process.env.BACKEND_PRIVATE_KEY,
                process.env.DEPLOYER_PRIVATE_KEY,
            ],
        },
        mantle: {
            url: process.env.ENDPOINT_URL_MANTLE,
            accounts: [
                process.env.BACKEND_PRIVATE_KEY,
                process.env.DEPLOYER_PRIVATE_KEY,
            ],
        },
        zksync: {
            url: "https://testnet.era.zksync.dev",
            ethNetwork: "https://rpc.ankr.com/eth_goerli", // RPC URL of the network (e.g. `https://goerli.infura.io/v3/<API_KEY>`)
            zksync: true,
        },
    },
};
