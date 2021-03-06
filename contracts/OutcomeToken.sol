pragma solidity ^0.4.17;

import '../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol';
import '../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';
import './IVotingMechanism.sol';

contract OutcomeToken is StandardToken, Ownable {

    string public name;
    mapping (address => uint) private backerTokens;
    address public voting;

    event Backed(address _backer, uint _value);
    event RedeemedBackerTokens(address _redeemer, uint _value);
    event RedeemedRewardTokens(address _redeemer, uint _value);

    function OutcomeToken(string _name, address _votingAddress) public {
        name = _name;
        voting = _votingAddress;
    }

    function back() public payable onlyOwner {
        require(msg.value > 0);
        balances[msg.sender] += msg.value;
        backerTokens[msg.sender] += msg.value;
        Backed(msg.sender, msg.value);
        Transfer(0, msg.sender, msg.value);
    }

    function redeemBackerTokens(uint _value) public onlyOwner {
        require(_value > 0);
        require(backerTokens[msg.sender] >= _value);
        IVotingMechanism votingContract = IVotingMechanism(voting);
        require(votingContract.checkVote(this) == IVotingMechanism.Vote.NOT_MET);
        backerTokens[msg.sender] -= _value;
        msg.sender.transfer(_value);
        RedeemedBackerTokens(msg.sender, _value);
    }

    function redeemRewardTokens(uint _value) public {
        require(_value > 0);
        require(balances[msg.sender] >= _value);
        IVotingMechanism votingContract = IVotingMechanism(voting);
        require(votingContract.checkVote(this) == IVotingMechanism.Vote.MET);
        balances[msg.sender] -= _value;
        msg.sender.transfer(_value);
        RedeemedRewardTokens(msg.sender, _value);
        Transfer(msg.sender, 0, msg.value);
    }

    function getBackerTokenAmount(address owner) view returns (uint) {
        return backerTokens[owner];
    }


}