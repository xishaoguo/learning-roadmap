// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

contract SimpleBank {
    mapping(address => uint256) private balances;

    function deposit() public payable {
        require(msg.value > 0, "amount is zero");
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(amount > 0, "amount is zero");
        require(balances[msg.sender] >= amount, "insufficient balance");

        balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "withdraw failed");
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    receive() external payable {
        deposit();
    }
}
