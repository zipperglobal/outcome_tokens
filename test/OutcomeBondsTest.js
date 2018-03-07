import EVMRevert from '../node_modules/zeppelin-solidity/test/helpers/EVMRevert';
var OutcomeToken = artifacts.require('OutcomeToken.sol');
var Voting = artifacts.require('AnybodyDecidesNoCap.sol');
require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('OutcomeToken', function(accounts) {
    var Vote = {
        UNKNOWN: 0,
        MET: 1,
        NOT_MET: 2
    };

    beforeEach(async function() {
        this.votingInstance = await Voting.new({from: accounts[0]});
        this.tokenInstance = await OutcomeToken.new('test', this.votingInstance.address, {from: accounts[0]}); 
    });

    it('should create an OutcomeToken.', async function() {
        let tokenName = await this.tokenInstance.name.call();
        let votingAddress = await this.tokenInstance.voting.call();
        assert.equal(tokenName, 'test');
        assert.equal(votingAddress, this.votingInstance.address);
    });

    it('should generate outcome token and backer token when backed.', async function() {
        await this.tokenInstance.back({ from: accounts[0], value: 100 });
        let outcomeTokens = await this.tokenInstance.balanceOf.call(accounts[0]);
        let backerTokens = await this.tokenInstance.getBackerTokenAmount.call(accounts[0]);
        assert.equal(outcomeTokens, 100);
        assert.equal(backerTokens, 100);
    });

    it('should deduct backer tokens and transfer ether when redeeming backer tokens after voting is NOT_MET.', async function() {
        var gasUsedInWei = 0;
        var gasPrice = 10**11;
        await this.tokenInstance.back({ from: accounts[0], value: 100 });
        let balanceBefore = web3.eth.getBalance(accounts[0]);
        await this.votingInstance.vote(this.tokenInstance.address, Vote.NOT_MET, { from: accounts[0], gasPrice: gasPrice }).then(function(result) {
            gasUsedInWei += result.receipt.cumulativeGasUsed*gasPrice;
        });
        await this.tokenInstance.redeemBackerTokens(100, { from: accounts[0], gasPrice: gasPrice }).then(function(result) {
            gasUsedInWei += result.receipt.cumulativeGasUsed*gasPrice;
        });
        let backerTokens = await this.tokenInstance.getBackerTokenAmount.call(accounts[0]);
        let balanceAfter = web3.eth.getBalance(accounts[0]);
        assert.equal(balanceAfter.add(gasUsedInWei).sub(balanceBefore).toString(), '100');
        assert.equal(backerTokens, 0);
    });

    it('should redeem outcome tokens after voting is MET.', async function() {
        var gasUsedInWei = 0;
        var gasPrice = 10**11;
        await this.tokenInstance.back({ from: accounts[0], value: 100 });
        await this.votingInstance.vote(this.tokenInstance.address, Vote.MET, { from: accounts[0] });
        let balanceBefore = web3.eth.getBalance(accounts[0]);
        await this.tokenInstance.redeemRewardTokens(100, { from: accounts[0], gasPrice: gasPrice  }).then(function(result) {
            gasUsedInWei += result.receipt.cumulativeGasUsed*gasPrice;
        });
        let balanceAfter = web3.eth.getBalance(accounts[0]);
        assert.equal(balanceAfter.add(gasUsedInWei).sub(balanceBefore).toString(), '100');
    });

    it('should not let a user redeem tokens when voting is UNKNOWN', async function() {
        await this.tokenInstance.back({ from: accounts[0], value: 100 });
        await this.tokenInstance.redeemBackerTokens(100, { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        await this.tokenInstance.redeemRewardTokens(100, { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
    });

    it('should be possible to back an outcome, and send the outcome tokens to someone else to redeem.', async function() {
        var gasUsedInWei = 0;
        var gasPrice = 10**11;
        await this.tokenInstance.back({ from: accounts[0], value: 100 });
        await this.tokenInstance.transfer(accounts[1], 100, { from: accounts[0] });
        await this.votingInstance.vote(this.tokenInstance.address, Vote.MET, { from: accounts[0] });
        let balanceBefore = web3.eth.getBalance(accounts[1]);
        await this.tokenInstance.redeemRewardTokens(100, { from: accounts[1], gasPrice: gasPrice }).then(function(result) {
            gasUsedInWei += result.receipt.cumulativeGasUsed*gasPrice;
        });
        let balanceAfter = web3.eth.getBalance(accounts[1]);
        assert.equal(balanceAfter.add(gasUsedInWei).sub(balanceBefore), '100');
    });



});