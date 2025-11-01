import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://127.0.0.1:7545',
      // the private key of signers, change it according to your ganache user
      chainId: 1337,
      accounts: [
        '0x183ab0ea1264493b4b26c16b0fa7a281de4069b6753d30013530ec601fd0f1aa'
      ]
    },
  },
};

export default config;
