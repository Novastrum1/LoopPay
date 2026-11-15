// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ILoopPayRewards {
    function rewardEligibility(uint256 id, address customer) external view returns (bool eligible, uint8 reason);
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
