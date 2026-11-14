// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ILoopPayRewards {
    function validCampaign(uint256 id, uint256 merchantId, address token) external view returns (bool);
    function earn(
        uint256 invoiceId,
        uint256 campaignId,
        uint256 merchantId,
        address token,
        address customer,
        uint256 amount
    ) external;
}
