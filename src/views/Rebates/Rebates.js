import "./Rebates.css";
import React from "react";
import { useLocalStorage } from "react-use";
import { useWeb3React } from "@web3-react/core";
import { useParams } from "react-router-dom";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Loader from "../../components/Common/Loader";
import Footer from "../../Footer";
import {
  useChainId,
  getPageTitle,
  useLocalStorageSerializeKey,
  isHashZero,
  REBATES_SELECTED_TAB_KEY,
  getServerUrl,
} from "../../Helpers";
import { useCodeOwner, useReferrerTier, useRebatesData } from "../../Api/rebates";
import TradersStats from "../../components/Rebates/TradersStats";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "../../components/Rebates/referralsHelper";
import { ethers } from "ethers";
import HistoryStats from "../../components/Rebates/HistoryStats";
import useSWR from "swr";

const CURRENT_WINDOW = "Current Window";
const HISTORY = "History";
const TAB_OPTIONS = [CURRENT_WINDOW, HISTORY];

function Rebates({ connectWallet, setPendingTxns, pendingTxns }) {
  let { active, account: walletAccount, library } = useWeb3React();

  const { account: queryAccount } = useParams();
  const { chainId } = useChainId();

  const smallCaseAddress = (walletAccount || "").toLocaleLowerCase();
  const userFeesURL = getServerUrl(chainId, "/fees_by_user?user=" + smallCaseAddress);


  const { data: feesdata, mutate: updateFeeStats } = useSWR([userFeesURL], {
    fetcher: (...args) =>
      fetch(userFeesURL)
        .then((res) => res.json())
        .catch(console.error),
  });
  console.log(feesdata);

  let account;
  if (queryAccount && ethers.utils.isAddress(queryAccount)) {
    account = ethers.utils.getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const [activeTab, setActiveTab] = useLocalStorage(REBATES_SELECTED_TAB_KEY, CURRENT_WINDOW);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey([chainId, "REFERRAL", account], [], {
    deserializer: deserializeSampleStats,
  });

  const { balance, deductMMF, enableFeature, loading } = useRebatesData(library, chainId, account);

  console.log({ balance, deductMMF, enableFeature });

  function renderHistoryTab() {
    if (loading) return <Loader />;
    return (
      <HistoryStats
        referralsData={feesdata}
        // handleCreateReferralCode={handleCreateReferralCode}
        setRecentlyAddedCodes={setRecentlyAddedCodes}
        recentlyAddedCodes={recentlyAddedCodes}
        chainId={chainId}
      />
    );
  }

  function renderCurrentWindowTab() {
    if (loading && !feesdata) return <Loader />;
    // if (isHashZero(userReferralCode) || !account || !userReferralCode) {
    //   return (
    //     <JoinReferralCode
    //       connectWallet={connectWallet}
    //       active={active}
    //       setPendingTxns={setPendingTxns}
    //       pendingTxns={pendingTxns}
    //     />
    //   );
    // }
    return (
      <TradersStats
        // userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        referralsData={feesdata}
        setPendingTxns={setPendingTxns}
        pendingTxns={pendingTxns}
        walletBalance={balance?.toString?.() ?? "0"}
        deductMMF={deductMMF}
        enableFeature={enableFeature}
      />
    );
  }

  return (
    <SEO title={getPageTitle("Rebates")}>
      <div className="default-container page-layout Referrals">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">Rebates</div>
            <div className="Page-description">
              <div style={{ marginBottom: "4px" }}>
                Receive up to 50% trading fee rebates in the form of USDC when you stake MMF into the rebate funding
                wallet.
              </div>
              <div style={{ marginBottom: "4px" }}>
                Receive to 100% trading fee rebates in the form of USDC when you qualify for the highest tier & have
                enabled deduction of MMF.
              </div>
              <div style={{ marginBottom: "4px" }}>
                Purchase MMF tokens{" "}
                <a target="_blank" rel="noopener noreferrer" href="https://polymm.finance/swap">
                  here
                </a>{" "}
              </div>
              For more information, please read:{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://mmfinance.gitbook.io/madmex-spot-and-perps/rebates"
              >
                Trading Rebate Program Details
              </a>
            </div>
          </div>
        </div>
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        {activeTab === HISTORY ? renderHistoryTab() : renderCurrentWindowTab()}
      </div>
      <Footer />
    </SEO>
  );
}

export default Rebates;
