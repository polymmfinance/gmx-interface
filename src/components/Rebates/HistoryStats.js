import { useMemo, useRef, useState } from "react";
import { FiPlus, FiTwitter } from "react-icons/fi";
import { useCopyToClipboard } from "react-use";
import { IoWarningOutline } from "react-icons/io5";
import { BiCopy, BiErrorCircle } from "react-icons/bi";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import { getNativeToken, getToken } from "../../data/Tokens";
import {
  bigNumberify,
  formatAmount,
  formatDate,
  getExplorerUrl,
  shortenAddress,
  POLYGON,
  limitDecimals,
} from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import {
  getTierIdDisplay,
  getTwitterShareUrl,
  getUSDValue,
  isRecentReferralCodeNotExpired,
  tierRebateInfo,
} from "./referralsHelper";
import { AffiliateCodeForm } from "./AddAffiliateCode";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

function getPreviousWednesdayEnd(offsetWeek) {
  const x = new Date();
  const date = new Date();

  x.setDate(date.getDate() - (offsetWeek*7) - ((date.getDay() + 3) % 7));
  x.setHours(0, 0, 0, 0);
  return x.toString()
}

function getDateString(b) {
  const x = new Date(parseInt(b));
  return x.toString()
}

function HistoryStats({
  referralsData = {},
  handleCreateReferralCode,
  chainId,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
}) {
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef(null);

  const [, copyToClipboard] = useCopyToClipboard();
  const open = () => setIsAddReferralCodeModalOpen(true);
  const close = () => setIsAddReferralCodeModalOpen(false);

  // const { cumulativeStats, referrerTotalStats = [], rebateDistributions, referrerTierInfo } = referralsData;
  // const allReferralCodes = referrerTotalStats.map((c) => c.referralCode.trim());
  const totalRebates = useMemo(
    () => {
      let data = bigNumberify(0);
      console.log(referralsData)
      Array.isArray(referralsData) && referralsData.forEach(x => {
        data = data.add(bigNumberify(x.amount))
        console.log(x.amount, data)
      });
      return formatAmount(data, 18)
      }, [referralsData]);

  // const tierId = referrerTierInfo?.tierId;
  // let referrerRebates = bigNumberify(0);
  // if (cumulativeStats && cumulativeStats.totalRebateUsd && cumulativeStats.discountUsd) {
  //   referrerRebates = cumulativeStats.totalRebateUsd.sub(cumulativeStats.discountUsd);
  // }

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        {/* <InfoCard
          label="Total Traders Referred"
          tooltipText="Amount of traders you referred."
          data={cumulativeStats?.registeredReferralsCount || "0"}
        /> */}
        {/* <InfoCard
          label="Total Trading Fees"
          tooltipText="Trading fees incurred by this account."
          data={getUSDValue(0)}
        /> */}
        <InfoCard
          label="Total Rebates"
          tooltipText="Total rebates paid out to this account."
          data={`$${limitDecimals(totalRebates, 4)}`}
        />
      </div>
      
      {referralsData?.length > 0 ? (
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
                    {/* <th className="table-head" scope="col">
                      Transaction
                    </th> */}
                  </tr>
                </thead>
                <tbody>
                  {referralsData.map((rebate, index) => {
                    // let tokenInfo;
                    // try {
                    //   tokenInfo = getToken(chainId, rebate.token);
                    // } catch {
                    //   tokenInfo = getNativeToken(chainId);
                    // }
                    // const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td className="table-head" data-label="Date">
                          { getDateString(rebate.timestamp) }
                        </td>
                        <td className="table-head" data-label="Amount">
                          $ {limitDecimals(formatAmount(rebate.amount, 18), 4)}
                        </td>
                        {/* <td className="table-head" data-label="Transaction">
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={explorerURL + `tx/${rebate.transactionHash}`}
                          >
                            {shortenAddress(rebate.transactionHash, 13)}
                          </a>
                        </td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyMessage tooltipText="Rebates are airdropped weekly." message="No rebates distribution history yet." />
      )}
    </div>
  );
}

export default HistoryStats;
