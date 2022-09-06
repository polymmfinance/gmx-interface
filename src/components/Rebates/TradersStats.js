import { useRef, useState } from "react";
import Card from "../Common/Card";
import Tooltip from "../Tooltip/Tooltip";
import { getNativeToken, getToken } from "../../data/Tokens";
import { formatAmount, formatDate, getExplorerUrl, shortenAddress } from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import { getTierIdDisplay, getUSDValue, tierDiscountInfo } from "./referralsHelper";
import Checkbox from "../Checkbox/Checkbox";
import { BigNumber } from "bignumber.js";
import { BIG_TEN } from "../../Api";

function TradersStats({ referralsData, chainId, walletBalance, setPendingTxns, pendingTxns }) {

  let traderTier = "0"
  const walletBalanceBN = new BigNumber(walletBalance)
  if (walletBalanceBN.gt(BIG_TEN.pow(18).times(10000))) {
    traderTier = "1"
  } else if (walletBalanceBN.gt(BIG_TEN.pow(18).times(20000))) {
    traderTier = "2"
  }

  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Trading Fees Incurred"
          tooltipText="Trading fees incurred by this account in this trading window."
          data={getUSDValue(referralsData?.referralTotalStats?.volume)}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText="Rebates earned by this account as a trader."
          data={getUSDValue(referralsData?.referralTotalStats?.discountUsd, 4)}
        />
        <InfoCard
          label="Funding Wallet Balance"
          data={
            <div className="active-referral-code">
              <div className="edit">
                <span>{formatAmount(walletBalance, 18, 2, true)} MMF</span>
              </div>
              {traderTier && (
                <div className="tier">
                  <Tooltip
                    handle={`Tier ${getTierIdDisplay(traderTier)} (${tierDiscountInfo[traderTier]}% discount)`}
                    position="right-bottom"
                    renderContent={() =>
                      `You will receive a ${tierDiscountInfo[traderTier]}% discount on your opening and closing fees, this discount will be airdropped to your account every Wednesday`
                    }
                  />
                </div>
              )}
            </div>
          }
        />
        <InfoCard
          label="Enable Fee Rebates"
          data={
            <div className="active-referral-code">
              <div className="edit">
                <Checkbox setIsChecked={() => { }}>Enable</Checkbox>
              </div>
              <div className="tier">
                <Tooltip
                  handle={`Click to toggle`}
                  position="right-bottom"
                  renderContent={() =>
                    `Opt-in to trading fee rebates programme`
                  }
                />
              </div>
            </div>
          }
        />

        <InfoCard
          label="Enable Deduct MMF"
          data={
            <div className="active-referral-code">
              <div className="edit">
                <Checkbox setIsChecked={() => { }}>Deduct MMF</Checkbox>
              </div>
              <div className="tier">
                <Tooltip
                  handle={`Click to toggle`}
                  position="right-bottom"
                  renderContent={() =>
                    `Opt-in to use MMF as trading fees`
                  }
                />
              </div>
            </div>
          }
        />

      </div>
      {referralsData?.discountDistributions.length > 0 ? (
        <div className="reward-history">
          <Card title="Rebates Distribution History" tooltipText="Rebates are airdropped weekly.">
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      Date
                    </th>
                    <th className="table-head" scope="col">
                      Amount
                    </th>
                    <th className="table-head" scope="col">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralsData?.discountDistributions.map((rebate, index) => {
                    let tokenInfo;
                    try {
                      tokenInfo = getToken(chainId, rebate.token);
                    } catch {
                      tokenInfo = getNativeToken(chainId);
                    }
                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                        <td data-label="Amount">
                          {formatAmount(rebate.amount, tokenInfo.decimals, 6, true)} {tokenInfo.symbol}
                        </td>
                        <td data-label="Transaction">
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={explorerURL + `tx/${rebate.transactionHash}`}
                          >
                            {shortenAddress(rebate.transactionHash, 20)}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyMessage message="No rebates distribution history yet." tooltipText="Rebates are airdropped weekly." />
      )}
    </div>
  );
}

export default TradersStats;
