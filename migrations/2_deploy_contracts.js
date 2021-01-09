
const dgToken = artifacts.require("FEYToken");

module.exports = async function(deployer, network, accounts) {

    // console.log(network);

    if (network == 'development') {

    }

    if (network == 'matic') {
    }

    // if (network == 'mumbai') {
    if (network == 'maticmain') {
        await deployer.deploy(FEYToken, '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4');
    }

};
