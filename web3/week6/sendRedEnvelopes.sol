// SPDX-License-Identifier: GPL-3.0
pragma solidity >= 0.8.0;

contract sendRedEnvelopes {
    //红包的发起人--钱包地址、代币名称
   address public payable erxiao;
   //是否等额
   bool isEqual;
   //红包的数量
   uint256 public count;
   //红包的总金额
   uint256 public totalAmount;
   //是否领取过红包
   mapping(address => bool) isGrabbed;

   constructor(uint256 c, bool _isEqual) payable {
         //用户传进来多少钱
         require(msg.value > 0, "sendRedEnvelopes: value must be greater than 0");
         erxiao = payable(msg.sender);
    
         count = c;
         isEqual = _isEqual;
         //红包的总额 == 用户传进来的总金额
         totalAmount = msg.value;
   }

    //检查下钱包的余额
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    //领取红包
    function grabRedPacket() public {
        //当前红包是不是领完了
        require(count > 0, "count must > 0");
        //是否领取过红包
        require(
            !isGrabbed[msg.sender],
            "You have already grabbed the red packet"
        );
        //标记为已领取
        isGrabbed[msg.sender] = true;
        if (count == 1) {
            (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
            require(success, "Transfer failed");
        } else {
            //如果不是等额的红包 计算一个10以内的随机数
            uint256 random = (uint256(
                keccak256(
                    abi.encodePacked(
                        msg.sender,
                        erxiao,
                        count,
                        totalAmount,
                        block.timestamp
                    )
                )
            ) % 8) + 1;
            uint256 amount = (totalAmount * random) / 10;
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Transfer failed");
            totalAmount -= amount;
        }
        //减少红包数量
        count--;
    }
}