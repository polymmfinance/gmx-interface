import { useRef, useState } from "react";
import { FiPlus, FiMinus } from "react-icons/fi";
import { useWeb3React } from "@web3-react/core";
import Card from "../Common/Card";
import Tooltip from "../Tooltip/Tooltip";
import { getNativeToken, getToken } from "../../data/Tokens";
import { formatAmount, formatDate, getExplorerUrl, limitDecimals, shortenAddress } from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import { getTierIdDisplay, tradingTierDiscountInfo } from "./referralsHelper";
import Checkbox from "../Checkbox/Checkbox";
import { BigNumber } from "bignumber.js";
import { BIG_TEN } from "../../Api";
import { toggleDeductMMF, toggleEnableFeature } from "../../Api/rebates";
import Modal from "../Modal/Modal";
import DepositAmountForm from "./DepositAmountForm";
import WithdrawAmountForm from "./WithdrawAmountForm";

function TradersStats({ referralsData, chainId, walletBalance, deductMMF, enableFeature, setPendingTxns }) {
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const depositModalRef = useRef(null);
  const withdrawModalRef = useRef(null);

  const { active, account: walletAccount, library } = useWeb3React();
  let traderTier = "0";
  const walletBalanceBN = new BigNumber(walletBalance);
  if (walletBalanceBN.gt(BIG_TEN.pow(18).times(10000))) {
    traderTier = "1";
  } else if (walletBalanceBN.gt(BIG_TEN.pow(18).times(20000))) {
    traderTier = "2";
  } else if (walletBalanceBN.gt(BIG_TEN.pow(18).times(50000))) {
    traderTier = "3";
  } else if (walletBalanceBN.gt(BIG_TEN.pow(18).times(100000))) {
    traderTier = "4";
  }

  async function clickEnableFeature() {
    toggleEnableFeature({
      library,
      chainId,
      onSubmitted: () => {},
      enable: !enableFeature,
    });
  }

  async function clickDeductMMF() {
    toggleDeductMMF({
      library,
      chainId,
      onSubmitted: () => {},
      enable: !deductMMF,
    });
  }

  const openDeposit = () => setIsDepositModalOpen(true);
  const closeDeposit = () => setIsDepositModalOpen(false);
  const openWithdraw = () => setIsWithdrawModalOpen(true);
  const closeWithdraw = () => setIsWithdrawModalOpen(false);

  const totalRebates = (tradingTierDiscountInfo[traderTier] * (referralsData?.total ?? 0)) / 100;

  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Trading Fees Incurred"
          tooltipText="Trading fees incurred by this account in this trading window."
          data={`$${limitDecimals(referralsData?.total ?? 0, 2)}`}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText={`Rebates earned by this account as a trader this window.${
            enableFeature ? "" : " Enable feature to view rebates accrued."
          }`}
          // data={getUSDValue(referralsData?.referralTotalStats?.discountUsd, 4)}
          data={`$${limitDecimals(enableFeature ? totalRebates ?? 0 : 0, 2)}`}
        />
        <InfoCard
          label="Funding Wallet Balance"
          data={
            <div className="active-rebates">
              <div className="edit">
                <span className="button">
                  <Tooltip
                    handle={<FiMinus size={18} onClick={() => openWithdraw()} />}
                    position="right-bottom"
                    renderContent={() => `Click to withdraw MMF from wallet`}
                  />
                </span>
                <span>{formatAmount(walletBalance, 18, 2, true)} MMF</span>
                <span className="button">
                  <Tooltip
                    handle={<FiPlus size={18} onClick={() => openDeposit()} />}
                    position="right-bottom"
                    renderContent={() => `Click to deposit MMF into wallet to receive your tier-ed discount`}
                  />
                </span>
              </div>
              {traderTier && (
                <div className="tier">
                  <Tooltip
                    handle={`Tier ${getTierIdDisplay(traderTier)} (${tradingTierDiscountInfo[traderTier]}% discount)`}
                    position="right-bottom"
                    renderContent={() =>
                      `You will receive a ${tradingTierDiscountInfo[traderTier]}% discount on your opening and closing fees, this discount will be airdropped to your account every Wednesday`
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
            <div className="active-rebates">
              <div className="edit">
                <Checkbox
                  isChecked={enableFeature}
                  setIsChecked={() => {
                    clickEnableFeature();
                  }}
                >
                  {enableFeature ? "Enabled" : "Enable"}
                </Checkbox>
              </div>
              <div className="tier">
                <Tooltip
                  handle={`Click to toggle`}
                  position="right-bottom"
                  renderContent={() => `Opt-in to trading fee rebates programme`}
                />
              </div>
            </div>
          }
        />

        <InfoCard
          label="Enable Deduct MMF"
          data={
            <div className="active-rebates">
              <div className="edit">
                <Checkbox
                  isChecked={deductMMF}
                  setIsChecked={() => {
                    clickDeductMMF();
                  }}
                >
                  {deductMMF ? "Will Deduct MMF" : "Deduct MMF"}
                </Checkbox>
              </div>
              <div className="tier">
                <Tooltip
                  handle={`Click to toggle`}
                  position="right-bottom"
                  renderContent={() => `Opt-in to use MMF as trading fees`}
                />
              </div>
            </div>
          }
        />

        <Modal
          className="Connect-wallet-modal"
          isVisible={isDepositModalOpen}
          setIsVisible={closeDeposit}
          label="Edit Deposit Amount"
          onAfterOpen={() => depositModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <DepositAmountForm
              active={active}
              // userReferralCodeString={userReferralCodeString}
              // setPendingTxns={setPendingTxns}
              // pendingTxns={pendingTxns}
              type="edit"
              callAfterSuccess={() => {
                setIsDepositModalOpen(false);
              }}
            />
          </div>
        </Modal>
        <Modal
          className="Connect-wallet-modal"
          isVisible={isWithdrawModalOpen}
          setIsVisible={closeWithdraw}
          label="Edit Withdraw Amount"
          onAfterOpen={() => withdrawModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <WithdrawAmountForm
              active={active}
              walletBalance={walletBalance}
              // userReferralCodeString={userReferralCodeString}
              // setPendingTxns={setPendingTxns}
              // pendingTxns={pendingTxns}
              type="edit"
              callAfterSuccess={() => {
                setIsWithdrawModalOpen(false);
              }}
            />
          </div>
        </Modal>
      </div>
      {/* {referralsData?.discountDistributions.length > 0 ? (
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
      )}*/}
    </div>
  );
}

export default TradersStats;
