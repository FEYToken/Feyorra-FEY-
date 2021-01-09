const PrivateKeyProvider = require("truffle-privatekey-provider");
const privateKey = 'C7F038F9A424D7604EE05A53FED9920F4859C4D283ED9385B93913C13266571C';

module.exports = {
    compilers: {
        solc: {
            version: "0.7.3",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 300
                }
            },
        }
    },
    networks: {
        development: {
            host: "127.0.0.1",
            port: 9545,
            network_id: 5777
        },
    },
    mocha: {
        useColors: true,
        reporter: "eth-gas-reporter",
        reporterOptions: {
            currency: "USD",
            gasPrice: 10
        }
    }
};
