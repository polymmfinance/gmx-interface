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
} from "../../Helpers";
import {
  useReferralsData,
  registerReferralCode,
  useCodeOwner,
  useReferrerTier,
  useUserReferralCode,
} from "../../Api/referrals";
import JoinReferralCode from "../../components/Rebates/JoinReferralCode";
import TradersStats from "../../components/Rebates/TradersStats";
import AddAffiliateCode from "../../components/Rebates/AddAffiliateCode";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "../../components/Rebates/referralsHelper";
import { ethers } from "ethers";
import HistoryStats from "../../components/Rebates/HistoryStats";

const CURRENT_WINDOW = "Current Window";
const HISTORY = "History";
const TAB_OPTIONS = [CURRENT_WINDOW, HISTORY];

function Rebates({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account: walletAccount, library } = useWeb3React();
  const { account: queryAccount } = useParams();
  let account;
  if (queryAccount && ethers.utils.isAddress(queryAccount)) {
    account = ethers.utils.getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REBATES_SELECTED_TAB_KEY, CURRENT_WINDOW);
  const { data: referralsData, loading } = useReferralsData(chainId, account);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey([chainId, "REFERRAL", account], [], {
    deserializer: deserializeSampleStats,
  });
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { referrerTier: traderTier } = useReferrerTier(library, chainId, codeOwner);

  function handleCreateReferralCode(referralCode) {
    return registerReferralCode(chainId, referralCode, library, {
      sentMsg: "Referral code submitted!",
      failMsg: "Referral code creation failed.",
      pendingTxns,
    });
  }

  function renderHistoryTab() {
    const isReferralCodeAvailable =
      referralsData?.codes?.length > 0 || recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).length > 0;
    if (loading) return <Loader />;
    if (isReferralCodeAvailable) {
      return (
        <HistoryStats
          referralsData={referralsData}
          handleCreateReferralCode={handleCreateReferralCode}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          recentlyAddedCodes={recentlyAddedCodes}
          chainId={chainId}
        />
      );
    } else {
      return (
        <AddAffiliateCode
          handleCreateReferralCode={handleCreateReferralCode}
          active={active}
          connectWallet={connectWallet}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
        />
      );
    }
  }

  function renderCurrentWindowTab() {
    if (loading) return <Loader />;
    if (isHashZero(userReferralCode) || !account || !userReferralCode) {
      return (
        <JoinReferralCode
          connectWallet={connectWallet}
          active={active}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    }
    return (
      <TradersStats
        userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        referralsData={referralsData}
        setPendingTxns={setPendingTxns}
        pendingTxns={pendingTxns}
        traderTier={traderTier}
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
              Get trading fee rebates when you lock your MMF into the rebate wallet. 
              You can choose whether to pay off your trading fees with MMF tokens, in doing so, MMF tokens will be deducted from your wallet, and the equivalent amount in rebates will be paid out to you.
              <br />
              For more information, please read the{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://mmfinance.gitbook.io/madmex-spot-and-perps/rebates"
              >
                trading rebate program details
              </a>
              .
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
