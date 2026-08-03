// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WalletStatus
/// @notice A small example contract for the Week 7 wallet-connection project.
contract WalletStatus {
    mapping(address => bool) public hasCheckedIn;

    event CheckedIn(address indexed account);

    function checkIn() external {
        hasCheckedIn[msg.sender] = true;
        emit CheckedIn(msg.sender);
    }
}
