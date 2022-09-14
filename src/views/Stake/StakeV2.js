import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";

import Modal from "../../components/Modal/Modal";
import Checkbox from "../../components/Checkbox/Checkbox";
import Tooltip from "../../components/Tooltip/Tooltip";
import Footer from "../../Footer";

import Vault from "../../abis/Vault.json";
import ReaderV2 from "../../abis/ReaderV2.json";
import Vester from "../../abis/Vester.json";
import RewardRouter from "../../abis/RewardRouter.json";
import RewardReader from "../../abis/RewardReader.json";
import Token from "../../abis/Token.json";
import GlpManager from "../../abis/GlpManager.json";
import glpBigIcon from "../../img/ic_glp_custom.svg";
import RewardTracker from "../../abis/RewardTracker.json";
import Masterchef from "../../abis/masterchef.json";

import VaultV2 from "../../abis/VaultV2.json";

import { ethers } from "ethers";
import {
  helperToast,
  bigNumberify,
  fetcher,
  formatAmount,
  formatKeyAmount,
  formatAmountFree,
  getChainName,
  expandDecimals,
  parseValue,
  approveTokens,
  getServerUrl,
  useLocalStorageSerializeKey,
  useChainId,
  GLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  ARBITRUM,
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
  getPageTitle,
  getMasterchefData,
  httpFetcher,
} from "../../Helpers";
import { callContract, useGmxPrice, useTotalGmxStaked, useTotalGmxSupply } from "../../Api";
import { getConstant } from "../../Constants";

import useSWR from "swr";

import { getContract } from "../../Addresses";

import "./StakeV2.css";
import SEO from "../../components/Common/SEO";

const { AddressZero } = ethers.constants;

export default function StakeV2({ setPendingTxns, connectWallet }) {
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  // const hasInsurance = true;

  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");
  const [stakeMethodName, setStakeMethodName] = useState("");
  const [stakePid, setStakePid] = useState(13);

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined);
  const [unstakeModalReservedAmount, setUnstakeModalReservedAmount] = useState(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");
  const [unstakePid, setUnstakePid] = useState(13);

  // const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  // const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  // const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  // const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState("");
  // const [vesterDepositBalance, setVesterDepositBalance] = useState("");
  // const [vesterDepositEscrowedBalance, setVesterDepositEscrowedBalance] = useState("");
  // const [vesterDepositVestedAmount, setVesterDepositVestedAmount] = useState("");
  // const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState("");
  // const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState("");
  // const [vesterDepositValue, setVesterDepositValue] = useState("");
  // const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState("");
  // const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState("");
  // const [vesterDepositAddress, setVesterDepositAddress] = useState("");

  // const [isVesterWithdrawModalVisible, setIsVesterWithdrawModalVisible] = useState(false);
  // const [vesterWithdrawTitle, setVesterWithdrawTitle] = useState(false);
  // const [vesterWithdrawAddress, setVesterWithdrawAddress] = useState("");

  // const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);
  // const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const glpAddress = getContract(chainId, "MLP");
  const masterchefAddress = getContract(chainId, "MasterChef");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");

  const glpManagerAddress = getContract(chainId, "GlpManager");

  const stakedGmxDistributorAddress = getContract(chainId, "StakedGmxDistributor");
  const stakedGlpDistributorAddress = getContract(chainId, "StakedGlpDistributor");

  const gmxVesterAddress = getContract(chainId, "GmxVester");
  const glpVesterAddress = getContract(chainId, "GlpVester");

  const vesterAddresses = [gmxVesterAddress, glpVesterAddress];

  const excludedEsGmxAccounts = [stakedGmxDistributorAddress, stakedGlpDistributorAddress];

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];
  const depositTokens = [
    // gmxAddress,
    // esGmxAddress,
    // stakedGmxTrackerAddress,
    // bonusGmxTrackerAddress,
    // bnGmxAddress,
    glpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    // stakedGmxTrackerAddress,
    // stakedGmxTrackerAddress,
    // bonusGmxTrackerAddress,
    // feeGmxTrackerAddress,
    // feeGmxTrackerAddress,
    feeGlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    // stakedGmxTrackerAddress,
    // bonusGmxTrackerAddress,
    // feeGmxTrackerAddress,
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress,
  ];

  const usdgAddress = getContract(chainId, "USDG");
  const tokensForBalanceAndSupplyQuery = [glpAddress, usdgAddress];
  const { data: balancesAndSupplies } = useSWR(
    [
      `GlpSwap:getTokenBalancesWithSupplies:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, ReaderV2, [tokensForBalanceAndSupplyQuery]),
    }
  );

  const { data: glpBalance } = useSWR(
    [`GlpSwap:glpBalance:${active}`, chainId, glpAddress, "balanceOf", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const { data: totalGlpStakedInMasterchef } = useSWR(
    [`GlpSwap:glpBalance:${active}`, chainId, glpAddress, "balanceOf", masterchefAddress || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const { data: glpStakeInMasterChef } = useSWR(
    [`GlpSwap:glpStakedMasterchef:${active}`, chainId, masterchefAddress, "userInfo"],
    {
      fetcher: fetcher(library, Masterchef, [13, account]),
    }
  );

  const { data: pendingMmfRewards } = useSWR(
    [`Masterchef:pendingMeerkat:${active}`, chainId, masterchefAddress, "pendingMeerkat"],
    {
      fetcher: fetcher(library, Masterchef, [13, account]),
    }
  );

  const { data: aums } = useSWR([`GlpSwap:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  });

  const { data: masterPoolInfo } = useSWR(
    [`MasterChef:masterPoolInfo:${active}`, chainId, masterchefAddress, "poolInfo"],
    {
      fetcher: fetcher(undefined, Masterchef, [13]),
    }
  );

  const { data: masterPoolTotalAlloc } = useSWR(
    [`MasterChef:masterPoolTotalAlloc:${active}`, chainId, masterchefAddress, "totalAllocPoint"],
    {
      fetcher: fetcher(undefined, Masterchef),
    }
  );

  const { data: mmfPairs } = useSWR(
    `https://api.dexscreener.com/latest/dex/tokens/0x22a31bD4cB694433B6de19e0aCC2899E553e9481`,
    { fetcher: httpFetcher }
  );

  // const { data: totalTokenWeights } = useSWR(
  //   [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
  //   {
  //     fetcher: fetcher(library, VaultV2),
  //   }
  // );

  const glpSupply = balancesAndSupplies ? balancesAndSupplies[1] : bigNumberify(0);
  const usdgSupply = balancesAndSupplies ? balancesAndSupplies[3] : bigNumberify(0);
  let aum;
  if (aums && aums.length > 0) {
    aum = true ? aums[0] : aums[1];
  }
  const glpPrice =
    aum && aum.gt(0) && glpSupply.gt(0)
      ? aum.mul(expandDecimals(1, GLP_DECIMALS)).div(glpSupply)
      : expandDecimals(1, USD_DECIMALS);
  let glpBalanceUsd;
  if (glpBalance) {
    glpBalanceUsd = glpBalance.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));
  }
  const glpSupplyUsd = glpSupply.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));

  let stakedAmount;
  let stakedAmountUSD;
  let totalMlpStakedPrice;
  if (glpStakeInMasterChef && glpStakeInMasterChef.amount && totalGlpStakedInMasterchef) {
    stakedAmount = glpStakeInMasterChef.amount;
    stakedAmountUSD = glpStakeInMasterChef.amount.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));
    totalMlpStakedPrice = totalGlpStakedInMasterchef.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));
  }

  const masterChefData = getMasterchefData(
    masterPoolInfo,
    masterPoolTotalAlloc,
    totalGlpStakedInMasterchef,
    formatAmount(glpPrice, USD_DECIMALS, 3, true),
    mmfPairs
  );

  const WEEKLY_FEES_IN_USD = 107000; // 107k USD
  const stakingApr = masterChefData?.apr ?? 0;
  const feesApr =
    (((WEEKLY_FEES_IN_USD / 7) * 365) / parseFloat(formatAmount(glpSupplyUsd, USD_DECIMALS, 2, false))) * 100;
  const totalApr = stakingApr + feesApr;

  // const { data: walletBalances } = useSWR(
  //   [
  //     `StakeV2:walletBalances:${active}`,
  //     chainId,
  //     readerAddress,
  //     "getTokenBalancesWithSupplies",
  //     account || PLACEHOLDER_ACCOUNT,
  //   ],
  //   {
  //     fetcher: fetcher(library, ReaderV2, [walletTokens]),
  //   }
  // );

  // const { data: depositBalances } = useSWR(
  //   [
  //     `StakeV2:depositBalances:${active}`,
  //     chainId,
  //     rewardReaderAddress,
  //     "getDepositBalances",
  //     account || PLACEHOLDER_ACCOUNT,
  //   ],
  //   {
  //     fetcher: fetcher(library, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
  //   }
  // );

  // const { data: stakingInfo } = useSWR(
  //   [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
  //   {
  //     fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
  //   }
  // );

  // const { data: stakedGmxSupply } = useSWR(
  //   [`StakeV2:stakedGmxSupply:${active}`, chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress],
  //   {
  //     fetcher: fetcher(library, Token),
  //   }
  // );
  const stakedGmxSupply = 0;
  const nativeTokenPrice = 0;

  // const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
  //   fetcher: fetcher(library, GlpManager),
  // });

  // const { data: nativeTokenPrice } = useSWR(
  //   [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
  //   {
  //     fetcher: fetcher(library, Vault),
  //   }
  // );

  // const { data: esGmxSupply } = useSWR(
  //   [`StakeV2:esGmxSupply:${active}`, chainId, readerAddress, "getTokenSupply", esGmxAddress],
  //   {
  //     fetcher: fetcher(library, ReaderV2, [excludedEsGmxAccounts]),
  //   }
  // );
  const esGmxSupply = 0;

  // const { data: vestingInfo } = useSWR(
  //   [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", account || PLACEHOLDER_ACCOUNT],
  //   {
  //     fetcher: fetcher(library, ReaderV2, [vesterAddresses]),
  //   }
  // );

  // const { gmxPrice, gmxPriceFromArbitrum, gmxPriceFromAvalanche } = useGmxPrice(
  //   chainId,
  //   { arbitrum: chainId === ARBITRUM ? library : undefined },
  //   active
  // );

  // let { total: totalGmxSupply } = useTotalGmxSupply();

  // let { avax: avaxGmxStaked, arbitrum: arbitrumGmxStaked, total: totalGmxStaked } = useTotalGmxStaked();

  // const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply");
  // const { data: gmxSupply } = useSWR([gmxSupplyUrl], {
  //   fetcher: (...args) => fetch(...args).then((res) => res.text()),
  // });
  const gmxSupply = 0,
    gmxPrice = 0;

  // const isGmxTransferEnabled = true;

  // let esGmxSupplyUsd;
  // if (esGmxSupply && gmxPrice) {
  //   esGmxSupplyUsd = esGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));
  // }

  // let aum;
  // if (aums && aums.length > 0) {
  //   aum = aums[0].add(aums[1]).div(2);
  // }

  // const { balanceData, supplyData } = getBalanceAndSupplyData(walletBalances);
  // const depositBalanceData = getDepositBalanceData(depositBalances);
  const processedData = {};
  // const stakingData = getStakingData(stakingInfo);
  // const vestingData = getVestingData(vestingInfo);

  // const processedData = getProcessedData(
  //   balanceData,
  //   supplyData,
  //   depositBalanceData,
  //   stakingData,
  //   vestingData,
  //   aum,
  //   nativeTokenPrice,
  //   stakedGmxSupply,
  //   gmxPrice,
  //   gmxSupply
  // );

  // let hasMultiplierPoints = false;
  // let multiplierPointsAmount;
  // if (processedData && processedData.bonusGmxTrackerRewards && processedData.bnGmxInFeeGmx) {
  //   multiplierPointsAmount = processedData.bonusGmxTrackerRewards.add(processedData.bnGmxInFeeGmx);
  //   if (multiplierPointsAmount.gt(0)) {
  //     hasMultiplierPoints = true;
  //   }
  // }
  // let totalRewardTokens;
  // if (processedData && processedData.bnGmxInFeeGmx && processedData.bonusGmxInFeeGmx) {
  //   totalRewardTokens = processedData.bnGmxInFeeGmx.add(processedData.bonusGmxInFeeGmx);
  // }

  // let totalRewardTokensAndGlp;
  // if (totalRewardTokens && processedData && processedData.glpBalance) {
  //   totalRewardTokensAndGlp = totalRewardTokens.add(processedData.glpBalance);
  // }

  // const bonusGmxInFeeGmx = processedData ? processedData.bonusGmxInFeeGmx : undefined;

  // let stakedGmxSupplyUsd;
  // if (!totalGmxStaked.isZero() && gmxPrice) {
  //   stakedGmxSupplyUsd = totalGmxStaked.mul(gmxPrice).div(expandDecimals(1, 18));
  // }

  // let totalSupplyUsd;
  // if (totalGmxSupply && !totalGmxSupply.isZero() && gmxPrice) {
  //   totalSupplyUsd = totalGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));
  // }

  let maxUnstakeableGmx = bigNumberify(0);
  // if (
  //   totalRewardTokens &&
  //   vestingData &&
  //   vestingData.gmxVesterPairAmount &&
  //   multiplierPointsAmount &&
  //   processedData.bonusGmxInFeeGmx
  // ) {
  //   const availableTokens = totalRewardTokens.sub(vestingData.gmxVesterPairAmount);
  //   const stakedTokens = processedData.bonusGmxInFeeGmx;
  //   const divisor = multiplierPointsAmount.add(stakedTokens);
  //   if (divisor.gt(0)) {
  //     maxUnstakeableGmx = availableTokens.mul(stakedTokens).div(divisor);
  //   }
  // }

  const showStakeMLPModal = () => {
    // if (!isGmxTransferEnabled) {
    //   helperToast.error("GMX transfers not yet enabled");
    //   return;
    // }
    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake MLP");
    setStakeModalMaxAmount(glpBalance);
    setStakeValue("");
    setStakingTokenSymbol("MLP");
    setStakingTokenAddress(glpAddress);
    setStakingFarmAddress(masterchefAddress);
    setStakeMethodName("deposit");
    setStakePid(13);
  };

  const onClickHarvest = () => {
    const contract = new ethers.Contract(masterchefAddress, Masterchef.abi, library.getSigner());
    callContract(chainId, contract, "deposit", [13, "0", "0x0000000000000000000000000000000000000000"], {
      sentMsg: "Harvest submitted!",
      failMsg: "Harvest failed.",
      successMsg: "Harvest completed!",
      setPendingTxns,
    });
    // .then(async (res) => {
    //   setIsVisible(false);
    // })
    // .finally(() => {
    //   setIsUnstaking(false);
    // });
  };

  // const showStakeEsGmxModal = () => {
  //   setIsStakeModalVisible(true);
  //   setStakeModalTitle("Stake esGMX");
  //   setStakeModalMaxAmount(processedData.esGmxBalance);
  //   setStakeValue("");
  //   setStakingTokenSymbol("esGMX");
  //   setStakingTokenAddress(esGmxAddress);
  //   setStakingFarmAddress(AddressZero);
  //   setStakeMethodName("stakeEsGmx");
  // };

  // const showGmxVesterDepositModal = () => {
  //   let remainingVestableAmount = vestingData.gmxVester.maxVestableAmount.sub(vestingData.gmxVester.vestedAmount);
  //   if (processedData.esGmxBalance.lt(remainingVestableAmount)) {
  //     remainingVestableAmount = processedData.esGmxBalance;
  //   }

  //   setIsVesterDepositModalVisible(true);
  //   setVesterDepositTitle("GMX Vault");
  //   setVesterDepositStakeTokenLabel("staked GMX + esGMX + Multiplier Points");
  //   setVesterDepositMaxAmount(remainingVestableAmount);
  //   setVesterDepositBalance(processedData.esGmxBalance);
  //   setVesterDepositEscrowedBalance(vestingData.gmxVester.escrowedBalance);
  //   setVesterDepositVestedAmount(vestingData.gmxVester.vestedAmount);
  //   setVesterDepositMaxVestableAmount(vestingData.gmxVester.maxVestableAmount);
  //   setVesterDepositAverageStakedAmount(vestingData.gmxVester.averageStakedAmount);
  //   setVesterDepositReserveAmount(vestingData.gmxVester.pairAmount);
  //   setVesterDepositMaxReserveAmount(totalRewardTokens);
  //   setVesterDepositValue("");
  //   setVesterDepositAddress(gmxVesterAddress);
  // };

  // const showGlpVesterDepositModal = () => {
  //   let remainingVestableAmount = vestingData.glpVester.maxVestableAmount.sub(vestingData.glpVester.vestedAmount);
  //   if (processedData.esGmxBalance.lt(remainingVestableAmount)) {
  //     remainingVestableAmount = processedData.esGmxBalance;
  //   }

  //   setIsVesterDepositModalVisible(true);
  //   setVesterDepositTitle("MLP Vault");
  //   setVesterDepositStakeTokenLabel("staked MLP");
  //   setVesterDepositMaxAmount(remainingVestableAmount);
  //   setVesterDepositBalance(processedData.esGmxBalance);
  //   setVesterDepositEscrowedBalance(vestingData.glpVester.escrowedBalance);
  //   setVesterDepositVestedAmount(vestingData.glpVester.vestedAmount);
  //   setVesterDepositMaxVestableAmount(vestingData.glpVester.maxVestableAmount);
  //   setVesterDepositAverageStakedAmount(vestingData.glpVester.averageStakedAmount);
  //   setVesterDepositReserveAmount(vestingData.glpVester.pairAmount);
  //   setVesterDepositMaxReserveAmount(processedData.glpBalance);
  //   setVesterDepositValue("");
  //   setVesterDepositAddress(glpVesterAddress);
  // };

  // const showGmxVesterWithdrawModal = () => {
  //   if (!vestingData || !vestingData.gmxVesterVestedAmount || vestingData.gmxVesterVestedAmount.eq(0)) {
  //     helperToast.error("You have not deposited any tokens for vesting.");
  //     return;
  //   }

  //   setIsVesterWithdrawModalVisible(true);
  //   setVesterWithdrawTitle("Withdraw from GMX Vault");
  //   setVesterWithdrawAddress(gmxVesterAddress);
  // };

  // const showGlpVesterWithdrawModal = () => {
  //   if (!vestingData || !vestingData.glpVesterVestedAmount || vestingData.glpVesterVestedAmount.eq(0)) {
  //     helperToast.error("You have not deposited any tokens for vesting.");
  //     return;
  //   }

  //   setIsVesterWithdrawModalVisible(true);
  //   setVesterWithdrawTitle("Withdraw from MLP Vault");
  //   setVesterWithdrawAddress(glpVesterAddress);
  // };

  const showUnstakeMLPModal = () => {
    // if (!isGmxTransferEnabled) {
    //   helperToast.error("GMX transfers not yet enabled");
    //   return;
    // }
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake MLP");
    let maxAmount = glpStakeInMasterChef.amount;
    // if (
    //   glpStakeInMasterChef &&
    //   vestingData &&
    //   vestingData.gmxVesterPairAmount.gt(0) &&
    //   maxUnstakeableGmx &&
    //   maxUnstakeableGmx.lt(glpStakeInMasterChef)
    // ) {
    //   maxAmount = maxUnstakeableGmx;
    // }
    setUnstakeModalMaxAmount(maxAmount);
    // setUnstakeModalReservedAmount(vestingData.gmxVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("MLP");
    setUnstakeMethodName("withdraw");
    setUnstakePid(13);
  };

  // const showUnstakeEsGmxModal = () => {
  //   setIsUnstakeModalVisible(true);
  //   setUnstakeModalTitle("Unstake esGMX");
  //   let maxAmount = processedData.esGmxInStakedGmx;
  //   if (
  //     processedData.esGmxInStakedGmx &&
  //     vestingData &&
  //     vestingData.gmxVesterPairAmount.gt(0) &&
  //     maxUnstakeableGmx &&
  //     maxUnstakeableGmx.lt(processedData.esGmxInStakedGmx)
  //   ) {
  //     maxAmount = maxUnstakeableGmx;
  //   }
  //   setUnstakeModalMaxAmount(maxAmount);
  //   setUnstakeModalReservedAmount(vestingData.gmxVesterPairAmount);
  //   setUnstakeValue("");
  //   setUnstakingTokenSymbol("esGMX");
  //   setUnstakeMethodName("unstakeEsGmx");
  // };

  // const renderMultiplierPointsLabel = useCallback(() => {
  //   return "Multiplier Points APR";
  // }, []);

  // const renderMultiplierPointsValue = useCallback(() => {
  //   return (
  //     <Tooltip
  //       handle={`100.00%`}
  //       position="right-bottom"
  //       renderContent={() => {
  //         return (
  //           <>
  //             Boost your rewards with Multiplier Points.&nbsp;
  //             <a
  //               href="https://mmfinance.gitbook.io/madmex-spot-and-perps/rewards#multiplier-points"
  //               rel="noreferrer"
  //               target="_blank"
  //             >
  //               More info
  //             </a>
  //             .
  //           </>
  //         );
  //       }}
  //     />
  //   );
  // }, []);

  // let earnMsg;
  // if (totalRewardTokensAndGlp && totalRewardTokensAndGlp.gt(0)) {
  //   let gmxAmountStr;
  //   // if (processedData.gmxInStakedGmx && processedData.gmxInStakedGmx.gt(0)) {
  //   //   gmxAmountStr = formatAmount(processedData.gmxInStakedGmx, 18, 2, true) + " GMX";
  //   // }
  //   // let esGmxAmountStr;
  //   // if (processedData.esGmxInStakedGmx && processedData.esGmxInStakedGmx.gt(0)) {
  //   //   esGmxAmountStr = formatAmount(processedData.esGmxInStakedGmx, 18, 2, true) + " esGMX";
  //   // }
  //   // let mpAmountStr;
  //   // if (processedData.bonusGmxInFeeGmx && processedData.bnGmxInFeeGmx.gt(0)) {
  //   //   mpAmountStr = formatAmount(processedData.bnGmxInFeeGmx, 18, 2, true) + " MP";
  //   // }
  //   let glpStr;
  //   if (processedData.glpBalance && processedData.glpBalance.gt(0)) {
  //     glpStr = formatAmount(processedData.glpBalance, 18, 2, true) + " MLP";
  //   }
  //   const amountStr = [glpStr].filter((s) => s).join(", ");
  //   earnMsg = (
  //     <div>
  //       You are earning {nativeTokenSymbol} rewards with {formatAmount(totalRewardTokensAndGlp, 18, 2, true)} tokens.
  //       <br />
  //       Tokens: {amountStr}.
  //     </div>
  //   );
  // }

  return (
    <div className="default-container page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        library={library}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={masterchefAddress}
        stakeMethodName={stakeMethodName}
        pid={stakePid}
        // hasMultiplierPoints={hasMultiplierPoints}
        setPendingTxns={setPendingTxns}
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
      />
      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        reservedAmount={unstakeModalReservedAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        library={library}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={masterchefAddress}
        unstakeMethodName={unstakeMethodName}
        pid={unstakePid}
        // multiplierPointsAmount={multiplierPointsAmount}
        // bonusGmxInFeeGmx={bonusGmxInFeeGmx}
      />
      {/*<VesterDepositModal
        isVisible={isVesterDepositModalVisible}
        setIsVisible={setIsVesterDepositModalVisible}
        chainId={chainId}
        title={vesterDepositTitle}
        stakeTokenLabel={vesterDepositStakeTokenLabel}
        maxAmount={vesterDepositMaxAmount}
        balance={vesterDepositBalance}
        escrowedBalance={vesterDepositEscrowedBalance}
        vestedAmount={vesterDepositVestedAmount}
        averageStakedAmount={vesterDepositAverageStakedAmount}
        maxVestableAmount={vesterDepositMaxVestableAmount}
        reserveAmount={vesterDepositReserveAmount}
        maxReserveAmount={vesterDepositMaxReserveAmount}
        value={vesterDepositValue}
        setValue={setVesterDepositValue}
        library={library}
        vesterAddress={vesterDepositAddress}
        setPendingTxns={setPendingTxns}
      />
      <VesterWithdrawModal
        isVisible={isVesterWithdrawModalVisible}
        setIsVisible={setIsVesterWithdrawModalVisible}
        vesterAddress={vesterWithdrawAddress}
        chainId={chainId}
        title={vesterWithdrawTitle}
        library={library}
        setPendingTxns={setPendingTxns}
      />
      <CompoundModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <ClaimModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      /> */}
      <div className="section-title-block">
        <div className="section-title-icon"></div>
        <div className="section-title-content">
          <div className="Page-title">Earn</div>
          <div className="Page-description">
            Stake{" "}
            {/* <a href="https://mmfinance.gitbook.io/madmex-spot-and-perps/tokenomics" target="_blank" rel="noopener noreferrer">
              GMX
            </a>{" "}
            and{" "} */}
            <a
              href="https://mmfinance.gitbook.io/madmex-spot-and-perps/liquid-staking-of-usdmlp"
              target="_blank"
              rel="noopener noreferrer"
            >
              MLP
            </a>{" "}
            to earn rewards.
          </div>
          {/* {earnMsg && <div className="Page-description">{earnMsg}</div>} */}
        </div>
      </div>
      <div className="StakeV2-content">
        <div className="StakeV2-cards">
          {/* <div className="App-card StakeV2-gmx-card">
            <div className="App-card-title">GMX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>
                  {!gmxPrice && "..."}
                  {gmxPrice && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={"$" + formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                      renderContent={() => (
                        <>
                          Price on Arbitrum: ${formatAmount(gmxPriceFromArbitrum, USD_DECIMALS, 2, true)}
                          <br />
                          Price on Avalanche: ${formatAmount(gmxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                        </>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "gmxBalance", 18, 2, true)} GMX ($
                  {formatKeyAmount(processedData, "gmxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "gmxInStakedGmx", 18, 2, true)} GMX ($
                  {formatKeyAmount(processedData, "gmxInStakedGmxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "gmxAprTotalWithBoost", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">Escrowed GMX APR</span>
                            <span>{formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%</span>
                          </div>
                          {(!processedData.gmxBoostAprForNativeToken ||
                            processedData.gmxBoostAprForNativeToken.eq(0)) && (
                            <div className="Tooltip-row">
                              <span className="label">{nativeTokenSymbol} APR</span>
                              <span>{formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%</span>
                            </div>
                          )}
                          {processedData.gmxBoostAprForNativeToken && processedData.gmxBoostAprForNativeToken.gt(0) && (
                            <div>
                              <br />
                              <div className="Tooltip-row">
                                <span className="label">{nativeTokenSymbol} Base APR</span>
                                <span>{formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                              <div className="Tooltip-row">
                                <span className="label">{nativeTokenSymbol} Boosted APR</span>
                                <span>{formatKeyAmount(processedData, "gmxBoostAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                              <div className="Tooltip-divider" />
                              <div className="Tooltip-row">
                                <span className="label">{nativeTokenSymbol} Total APR</span>
                                <span>
                                  {formatKeyAmount(processedData, "gmxAprForNativeTokenWithBoost", 2, 2, true)}%
                                </span>
                              </div>
                              <br />
                              <div className="muted">The Boosted APR is from your staked Multiplier Points.</div>
                            </div>
                          )}
                          <div className="muted">
                            <br />
                            APRs are updated weekly on Wednesday and will depend on the fees collected for the week.
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalGmxRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">
                              {nativeTokenSymbol} ({wrappedTokenSymbol})
                            </span>
                            <span>
                              {formatKeyAmount(processedData, "feeGmxTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "feeGmxTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                          <div className="Tooltip-row">
                            <span className="label">Escrowed GMX</span>
                            <span>
                              {formatKeyAmount(processedData, "stakedGmxTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "stakedGmxTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Boost Percentage</div>
                <div>
                  <Tooltip
                    handle={`${formatAmount(processedData.boostBasisPoints, 2, 2, false)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          You are earning {formatAmount(processedData.boostBasisPoints, 2, 2, false)}% more{" "}
                          {nativeTokenSymbol} rewards using {formatAmount(processedData.bnGmxInFeeGmx, 18, 4, 2, true)}{" "}
                          Staked Multiplier Points.
                          <br />
                          <br />
                          Use the "Compound" button to stake your Multiplier Points.
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {!totalGmxStaked && "..."}
                  {totalGmxStaked && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={
                        formatAmount(totalGmxStaked, 18, 0, true) +
                        " GMX" +
                        ` ($${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)})`
                      }
                      renderContent={() => (
                        <>
                          Arbitrum: {formatAmount(arbitrumGmxStaked, 18, 0, true)} GMX
                          <br />
                          Avalanche: {formatAmount(avaxGmxStaked, 18, 0, true)} GMX
                        </>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                {!totalGmxSupply && "..."}
                {totalGmxSupply && (
                  <div>
                    {formatAmount(totalGmxSupply, 18, 0, true)} GMX ($
                    {formatAmount(totalSupplyUsd, USD_DECIMALS, 0, true)})
                  </div>
                )}
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <Link className="App-button-option App-card-option" to="/buy_gmx">
                  Buy GMX
                </Link>
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showStakeGmxModal()}>
                    Stake
                  </button>
                )}
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showUnstakeGmxModal()}>
                    Unstake
                  </button>
                )}
                {active && (
                  <Link className="App-button-option App-card-option" to="/begin_account_transfer">
                    Transfer Account
                  </Link>
                )}
              </div>
            </div>
          </div> */}
          {/* <div className="App-card primary StakeV2-total-rewards-card">
            <div className="App-card-title">Total Rewards</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  {nativeTokenSymbol} ({wrappedTokenSymbol})
                </div>
                <div>
                  {formatKeyAmount(processedData, "totalNativeTokenRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalNativeTokenRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">GMX</div>
                <div>
                  {formatKeyAmount(processedData, "totalVesterRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalVesterRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Escrowed GMX</div>
                <div>
                  {formatKeyAmount(processedData, "totalEsGmxRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalEsGmxRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Multiplier Points</div>
                <div>{formatKeyAmount(processedData, "bonusGmxTrackerRewards", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked Multiplier Points</div>
                <div>{formatKeyAmount(processedData, "bnGmxInFeeGmx", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Total</div>
                <div>${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-bottom-placeholder">
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {active && <button className="App-button-option App-card-option">Compound</button>}
                  {active && <button className="App-button-option App-card-option">Claim</button>}
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
              <div className="App-card-bottom">
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {active && (
                    <button
                      className="App-button-option App-card-option"
                      onClick={() => setIsCompoundModalVisible(true)}
                    >
                      Compound
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => setIsClaimModalVisible(true)}>
                      Claim
                    </button>
                  )}
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div> */}
          <div className="App-card">
            <div className="Home-token-card-option-icon">
              <img src={glpBigIcon} alt="glpBigIcon" /> MLP
            </div>
            <div className="Home-token-card-option-title-polygon">
              MLP is the liquidity provider token. <br />
              <a
                href="https://mmfinance.gitbook.io/madmex-spot-and-perps/protocol-fee-distribution"
                target={"_blank"}
                rel="noreferrer"
              >
                Accrues 70% of the platform's generated fees.
              </a>
            </div>
            <div>Fees are distributed into the MLP pool weekly and it will reflect via the change in MLP price.</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                {/* <div>${formatKeyAmount(processedData, "glpPrice", USD_DECIMALS, 3, true)}</div> */}
                <div>${formatAmount(glpPrice, USD_DECIMALS, 3, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} MLP ($
                  {formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatAmount(stakedAmount, GLP_DECIMALS, 4, true)} MLP ($
                  {formatAmount(stakedAmountUSD, USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  {/* TODO: need to add MATIC APR into total */}
                  <Tooltip
                    handle={`${totalApr.toFixed(2)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">Fees APR</span>
                            <span>{(feesApr ?? 0).toFixed(2)}%</span>
                          </div>
                          <div className="Tooltip-row">
                            <span className="label">Liquid Staking APR</span>
                            <span>{(masterChefData?.apr ?? 0).toFixed(2)}%</span>
                          </div>
                          <br />
                          <div className="muted">
                            APRs are updated weekly on Wednesday and will depend on the fees collected for the week.
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip
                    handle={`$${(
                      parseFloat(formatAmount(pendingMmfRewards, GLP_DECIMALS, 10, true)) * masterChefData?.mmfPrice
                    ).toFixed(2)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label">MMF</span>
                            <span>
                              {formatAmount(pendingMmfRewards, GLP_DECIMALS, 3, true)} ($
                              {(
                                parseFloat(formatAmount(pendingMmfRewards, GLP_DECIMALS, 10, true)) *
                                masterChefData?.mmfPrice
                              ).toFixed(2)}
                              )
                            </span>
                          </div>
                          {/* <div className="Tooltip-row">
                            <span className="label">Escrowed GMX</span>
                            <span>
                              {formatKeyAmount(processedData, "stakedGlpTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "stakedGlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div> */}
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatAmount(totalGlpStakedInMasterchef, GLP_DECIMALS, 4, true)} MLP ($
                  {formatAmount(totalMlpStakedPrice, USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatAmount(glpSupply, GLP_DECIMALS, 4, true)} MLP ($
                  {formatAmount(glpSupplyUsd, USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <Link className="App-button-option App-card-option" to="/buy_mlp">
                  Buy MLP
                </Link>
                <Link className="App-button-option App-card-option" to="/buy_mlp#redeem">
                  Sell MLP
                </Link>
                {active && pendingMmfRewards?.gt(0) && (
                  <button className="App-button-option App-card-option" onClick={() => onClickHarvest()}>
                    Harvest
                  </button>
                )}
                {active && glpBalance?.gt(0) && (
                  <button className="App-button-option App-card-option" onClick={() => showStakeMLPModal()}>
                    Stake
                  </button>
                )}
                {active && glpStakeInMasterChef?.amount?.gt(0) && (
                  <button className="App-button-option App-card-option" onClick={() => showUnstakeMLPModal()}>
                    Unstake
                  </button>
                )}
                {/* <a
                  href="https://polymm.finance/farms"
                  target="_blank"
                  rel="noreferrer"
                  className="App-button-option App-card-option"
                >
                  Stake
                </a> */}
                <a
                  href="https://mmfinance.gitbook.io/madmex-spot-and-perps/mlp"
                  target="_blank"
                  rel="noreferrer"
                  className="App-button-option App-card-option"
                >
                  Read more
                </a>
                {/* {hasInsurance && (
                  <a
                    className="App-button-option App-card-option"
                    href="https://app.insurace.io/Insurance/Cart?id=124&referrer=545066382753150189457177837072918687520318754040"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Purchase Insurance
                  </a>
                )} */}
              </div>
            </div>
          </div>
          {/* <div className="App-card">
            <div className="App-card-title">Escrowed GMX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>${formatAmount(gmxPrice, USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "esGmxBalance", 18, 2, true)} esGMX ($
                  {formatKeyAmount(processedData, "esGmxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "esGmxInStakedGmx", 18, 2, true)} esGMX ($
                  {formatKeyAmount(processedData, "esGmxInStakedGmxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "gmxAprTotalWithBoost", 2, 2, true)}%`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            <div className="Tooltip-row">
                              <span className="label">
                                {nativeTokenSymbol} ({wrappedTokenSymbol}) Base APR
                              </span>
                              <span>{formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%</span>
                            </div>
                            {processedData.bnGmxInFeeGmx && processedData.bnGmxInFeeGmx.gt(0) && (
                              <div className="Tooltip-row">
                                <span className="label">
                                  {nativeTokenSymbol} ({wrappedTokenSymbol}) Boosted APR
                                </span>
                                <span>{formatKeyAmount(processedData, "gmxBoostAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                            )}
                            <div className="Tooltip-row">
                              <span className="label">Escrowed GMX APR</span>
                              <span>{formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%</span>
                            </div>
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatKeyAmount(processedData, "stakedEsGmxSupply", 18, 0, true)} esGMX ($
                  {formatKeyAmount(processedData, "stakedEsGmxSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatAmount(esGmxSupply, 18, 0, true)} esGMX (${formatAmount(esGmxSupplyUsd, USD_DECIMALS, 0, true)}
                  )
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showStakeEsGmxModal()}>
                    Stake
                  </button>
                )}
                {active && (
                  <button className="App-button-option App-card-option" onClick={() => showUnstakeEsGmxModal()}>
                    Unstake
                  </button>
                )}
                {!active && (
                  <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </div> */}
        </div>
      </div>

      {/* <div>
        <div className="Tab-title-section">
          <div className="Page-title">Vest</div>
          <div className="Page-description">
            Convert esGMX tokens to GMX tokens.
            <br />
            Please read the{" "}
            <a href="https://mmfinance.gitbook.io/madmex-spot-and-perps/rewards#vesting" target="_blank" rel="noopener noreferrer">
              vesting details
            </a>{" "}
            before using the vaults.
          </div>
        </div>
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-gmx-card">
              <div className="App-card-title">GMX Vault</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Staked Tokens</div>
                  <div>
                    <Tooltip
                      handle={formatAmount(totalRewardTokens, 18, 2, true)}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatAmount(processedData.gmxInStakedGmx, 18, 2, true)} GMX
                            <br />
                            {formatAmount(processedData.esGmxInStakedGmx, 18, 2, true)} esGMX
                            <br />
                            {formatAmount(processedData.bnGmxInFeeGmx, 18, 2, true)} Multiplier Points
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Reserved for Vesting</div>
                  <div>
                    {formatKeyAmount(vestingData, "gmxVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(totalRewardTokens, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Vesting Status</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "gmxVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "gmxVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatKeyAmount(vestingData, "gmxVesterClaimSum", 18, 4, true)} tokens have been converted
                            to GMX from the&nbsp;
                            {formatKeyAmount(vestingData, "gmxVesterVestedAmount", 18, 4, true)} esGMX deposited for
                            vesting.
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Claimable</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "gmxVesterClaimable", 18, 4, true)} GMX`}
                      position="right-bottom"
                      renderContent={() =>
                        `${formatKeyAmount(
                          vestingData,
                          "gmxVesterClaimable",
                          18,
                          4,
                          true
                        )} GMX tokens can be claimed, use the options under the Total Rewards section to claim them.`
                      }
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showGmxVesterDepositModal()}>
                      Deposit
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showGmxVesterWithdrawModal()}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="App-card StakeV2-gmx-card">
              <div className="App-card-title">MLP Vault</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Staked Tokens</div>
                  <div>{formatAmount(processedData.glpBalance, 18, 2, true)} MLP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Reserved for Vesting</div>
                  <div>
                    {formatKeyAmount(vestingData, "glpVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(processedData.glpBalance, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Vesting Status</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "glpVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "glpVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatKeyAmount(vestingData, "glpVesterClaimSum", 18, 4, true)} tokens have been converted
                            to GMX from the&nbsp;
                            {formatKeyAmount(vestingData, "glpVesterVestedAmount", 18, 4, true)} esGMX deposited for
                            vesting.
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Claimable</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "glpVesterClaimable", 18, 4, true)} GMX`}
                      position="right-bottom"
                      renderContent={() =>
                        `${formatKeyAmount(
                          vestingData,
                          "glpVesterClaimable",
                          18,
                          4,
                          true
                        )} GMX tokens can be claimed, use the options under the Total Rewards section to claim them.`
                      }
                    ></Tooltip>
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showGlpVesterDepositModal()}>
                      Deposit
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showGlpVesterWithdrawModal()}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}
      <Footer />
    </div>
  );
}

// function ClaimModal(props) {
//   const {
//     isVisible,
//     setIsVisible,
//     rewardRouterAddress,
//     library,
//     chainId,
//     setPendingTxns,
//     nativeTokenSymbol,
//     wrappedTokenSymbol,
//   } = props;
//   const [isClaiming, setIsClaiming] = useState(false);
//   const [shouldClaimGmx, setShouldClaimGmx] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-claim-should-claim-gmx"],
//     true
//   );
//   const [shouldClaimEsGmx, setShouldClaimEsGmx] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-claim-should-claim-es-gmx"],
//     true
//   );
//   const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-claim-should-claim-weth"],
//     true
//   );
//   const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-claim-should-convert-weth"],
//     true
//   );

//   const isPrimaryEnabled = () => {
//     return !isClaiming;
//   };

//   const getPrimaryText = () => {
//     if (isClaiming) {
//       return `Claiming...`;
//     }
//     return "Claim";
//   };

//   const onClickPrimary = () => {
//     setIsClaiming(true);

//     const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
//     callContract(
//       chainId,
//       contract,
//       "handleRewards",
//       [
//         shouldClaimGmx,
//         false, // shouldStakeGmx
//         shouldClaimEsGmx,
//         false, // shouldStakeEsGmx
//         false, // shouldStakeMultiplierPoints
//         shouldClaimWeth,
//         shouldConvertWeth,
//       ],
//       {
//         sentMsg: "Claim submitted.",
//         failMsg: "Claim failed.",
//         successMsg: "Claim completed!",
//         setPendingTxns,
//       }
//     )
//       .then(async (res) => {
//         setIsVisible(false);
//       })
//       .finally(() => {
//         setIsClaiming(false);
//       });
//   };

//   const toggleConvertWeth = (value) => {
//     if (value) {
//       setShouldClaimWeth(true);
//     }
//     setShouldConvertWeth(value);
//   };

//   return (
//     <div className="StakeModal">
//       <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Claim Rewards">
//         <div className="CompoundModal-menu">
//           <div>
//             <Checkbox isChecked={shouldClaimGmx} setIsChecked={setShouldClaimGmx}>
//               Claim GMX Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldClaimEsGmx} setIsChecked={setShouldClaimEsGmx}>
//               Claim esGMX Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
//               Claim {wrappedTokenSymbol} Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
//               Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
//             </Checkbox>
//           </div>
//         </div>
//         <div className="Exchange-swap-button-container">
//           <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
//             {getPrimaryText()}
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    active,
    account,
    library,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    rewardRouterAddress,
    stakeMethodName,
    setPendingTxns,
    pid,
  } = props;
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && stakingTokenAddress && [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  let amount = parseValue(value, 18);
  const needApproval = farmAddress !== AddressZero && tokenAllowance && amount && amount.gt(tokenAllowance);

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return "Enter an amount";
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return "Max amount exceeded";
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, Masterchef.abi, library.getSigner());
    callContract(chainId, contract, stakeMethodName, [pid, amount, "0x0000000000000000000000000000000000000000"], {
      sentMsg: "Stake submitted!",
      failMsg: "Stake failed.",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsStaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return `Approving ${stakingTokenSymbol}...`;
    }
    if (needApproval) {
      return `Approve ${stakingTokenSymbol}`;
    }
    if (isStaking) {
      return "Staking...";
    }
    return "Stake";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Stake</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    library,
    unstakingTokenSymbol,
    rewardRouterAddress,
    unstakeMethodName,
    // multiplierPointsAmount,
    reservedAmount,
    // bonusGmxInFeeGmx,
    setPendingTxns,
    pid,
  } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);

  let amount = parseValue(value, 18);
  // let burnAmount;

  // if (
  //   multiplierPointsAmount &&
  //   multiplierPointsAmount.gt(0) &&
  //   amount &&
  //   amount.gt(0) &&
  //   bonusGmxInFeeGmx &&
  //   bonusGmxInFeeGmx.gt(0)
  // ) {
  //   burnAmount = multiplierPointsAmount.mul(amount).div(bonusGmxInFeeGmx);
  // }

  // const shouldShowReductionAmount = true;
  // let rewardReductionBasisPoints;
  // if (burnAmount && bonusGmxInFeeGmx) {
  //   rewardReductionBasisPoints = burnAmount.mul(BASIS_POINTS_DIVISOR).div(bonusGmxInFeeGmx);
  // }

  const getError = () => {
    if (!amount) {
      return "Enter an amount";
    }
    if (amount.gt(maxAmount)) {
      return "Max amount exceeded";
    }
  };

  const onClickPrimary = () => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, Masterchef.abi, library.getSigner());
    callContract(chainId, contract, unstakeMethodName, [pid, amount], {
      sentMsg: "Unstake submitted!",
      failMsg: "Unstake failed.",
      successMsg: "Unstake completed!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isUnstaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return "Unstaking...";
    }
    return "Unstake";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Unstake</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{unstakingTokenSymbol}</div>
          </div>
        </div>
        {/* {reservedAmount && reservedAmount.gt(0) && (
          <div className="Modal-note">
            You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.
          </div>
        )} */}
        {/* {burnAmount && burnAmount.gt(0) && rewardReductionBasisPoints && rewardReductionBasisPoints.gt(0) && (
          <div className="Modal-note">
            Unstaking will burn&nbsp;
            <a
              href="https://mmfinance.gitbook.io/madmex-spot-and-perps/rewards"
              target="_blank"
              rel="noopener noreferrer"
            >
              {formatAmount(burnAmount, 18, 4, true)} Multiplier Points
            </a>
            .&nbsp;
            {shouldShowReductionAmount && (
              <span>Boost Percentage: -{formatAmount(rewardReductionBasisPoints, 2, 2)}%.</span>
            )}
          </div>
        )} */}
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// function VesterDepositModal(props) {
//   const {
//     isVisible,
//     setIsVisible,
//     chainId,
//     title,
//     maxAmount,
//     value,
//     setValue,
//     balance,
//     vestedAmount,
//     averageStakedAmount,
//     maxVestableAmount,
//     library,
//     stakeTokenLabel,
//     reserveAmount,
//     maxReserveAmount,
//     vesterAddress,
//     setPendingTxns,
//   } = props;
//   const [isDepositing, setIsDepositing] = useState(false);

//   let amount = parseValue(value, 18);

//   let nextReserveAmount = reserveAmount;

//   let nextDepositAmount = vestedAmount;
//   if (amount) {
//     nextDepositAmount = vestedAmount.add(amount);
//   }

//   let additionalReserveAmount = bigNumberify(0);
//   if (amount && averageStakedAmount && maxVestableAmount && maxVestableAmount.gt(0)) {
//     nextReserveAmount = nextDepositAmount.mul(averageStakedAmount).div(maxVestableAmount);
//     if (nextReserveAmount.gt(reserveAmount)) {
//       additionalReserveAmount = nextReserveAmount.sub(reserveAmount);
//     }
//   }

//   const getError = () => {
//     if (!amount || amount.eq(0)) {
//       return "Enter an amount";
//     }
//     if (maxAmount && amount.gt(maxAmount)) {
//       return "Max amount exceeded";
//     }
//     if (nextReserveAmount.gt(maxReserveAmount)) {
//       return "Insufficient staked tokens";
//     }
//   };

//   const onClickPrimary = () => {
//     setIsDepositing(true);
//     const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

//     callContract(chainId, contract, "deposit", [amount], {
//       sentMsg: "Deposit submitted!",
//       failMsg: "Deposit failed!",
//       successMsg: "Deposited!",
//       setPendingTxns,
//     })
//       .then(async (res) => {
//         setIsVisible(false);
//       })
//       .finally(() => {
//         setIsDepositing(false);
//       });
//   };

//   const isPrimaryEnabled = () => {
//     const error = getError();
//     if (error) {
//       return false;
//     }
//     if (isDepositing) {
//       return false;
//     }
//     return true;
//   };

//   const getPrimaryText = () => {
//     const error = getError();
//     if (error) {
//       return error;
//     }
//     if (isDepositing) {
//       return "Depositing...";
//     }
//     return "Deposit";
//   };

//   return (
//     <SEO title={getPageTitle("Earn")}>
//       <div className="StakeModal">
//         <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title} className="non-scrollable">
//           <div className="Exchange-swap-section">
//             <div className="Exchange-swap-section-top">
//               <div className="muted">
//                 <div className="Exchange-swap-usd">Deposit</div>
//               </div>
//               <div
//                 className="muted align-right clickable"
//                 onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}
//               >
//                 Max: {formatAmount(maxAmount, 18, 4, true)}
//               </div>
//             </div>
//             <div className="Exchange-swap-section-bottom">
//               <div>
//                 <input
//                   type="number"
//                   placeholder="0.0"
//                   className="Exchange-swap-input"
//                   value={value}
//                   onChange={(e) => setValue(e.target.value)}
//                 />
//               </div>
//               <div className="PositionEditor-token-symbol">esGMX</div>
//             </div>
//           </div>
//           <div className="VesterDepositModal-info-rows">
//             <div className="Exchange-info-row">
//               <div className="Exchange-info-label">Wallet</div>
//               <div className="align-right">{formatAmount(balance, 18, 2, true)} esGMX</div>
//             </div>
//             <div className="Exchange-info-row">
//               <div className="Exchange-info-label">Vault Capacity</div>
//               <div className="align-right">
//                 <Tooltip
//                   handle={`${formatAmount(nextDepositAmount, 18, 2, true)} / ${formatAmount(
//                     maxVestableAmount,
//                     18,
//                     2,
//                     true
//                   )}`}
//                   position="right-bottom"
//                   renderContent={() => {
//                     return (
//                       <>
//                         Vault Capacity for your Account
//                         <br />
//                         <br />
//                         Deposited: {formatAmount(vestedAmount, 18, 2, true)} esGMX
//                         <br />
//                         Max Capacity: {formatAmount(maxVestableAmount, 18, 2, true)} esGMX
//                         <br />
//                       </>
//                     );
//                   }}
//                 />
//               </div>
//             </div>
//             <div className="Exchange-info-row">
//               <div className="Exchange-info-label">Reserve Amount</div>
//               <div className="align-right">
//                 <Tooltip
//                   handle={`${formatAmount(
//                     reserveAmount && reserveAmount.gte(additionalReserveAmount)
//                       ? reserveAmount
//                       : additionalReserveAmount,
//                     18,
//                     2,
//                     true
//                   )} / ${formatAmount(maxReserveAmount, 18, 2, true)}`}
//                   position="right-bottom"
//                   renderContent={() => {
//                     return (
//                       <>
//                         Current Reserved: {formatAmount(reserveAmount, 18, 2, true)}
//                         <br />
//                         Additional reserve required: {formatAmount(additionalReserveAmount, 18, 2, true)}
//                         <br />
//                         {amount && nextReserveAmount.gt(maxReserveAmount) && (
//                           <div>
//                             <br />
//                             You need a total of at least {formatAmount(nextReserveAmount, 18, 2, true)}{" "}
//                             {stakeTokenLabel} to vest {formatAmount(amount, 18, 2, true)} esGMX.
//                           </div>
//                         )}
//                       </>
//                     );
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//           <div className="Exchange-swap-button-container">
//             <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
//               {getPrimaryText()}
//             </button>
//           </div>
//         </Modal>
//       </div>
//     </SEO>
//   );
// }

// function VesterWithdrawModal(props) {
//   const { isVisible, setIsVisible, chainId, title, library, vesterAddress, setPendingTxns } = props;
//   const [isWithdrawing, setIsWithdrawing] = useState(false);

//   const onClickPrimary = () => {
//     setIsWithdrawing(true);
//     const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

//     callContract(chainId, contract, "withdraw", [], {
//       sentMsg: "Withdraw submitted.",
//       failMsg: "Withdraw failed.",
//       successMsg: "Withdrawn!",
//       setPendingTxns,
//     })
//       .then(async (res) => {
//         setIsVisible(false);
//       })
//       .finally(() => {
//         setIsWithdrawing(false);
//       });
//   };

//   return (
//     <div className="StakeModal">
//       <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
//         <div>
//           This will withdraw and unreserve all tokens as well as pause vesting.
//           <br />
//           <br />
//           esGMX tokens that have been converted to GMX will remain as GMX tokens.
//           <br />
//           <br />
//           To claim GMX tokens without withdrawing, use the "Claim" button under the Total Rewards section.
//           <br />
//           <br />
//         </div>
//         <div className="Exchange-swap-button-container">
//           <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={isWithdrawing}>
//             {!isWithdrawing && "Confirm Withdraw"}
//             {isWithdrawing && "Confirming..."}
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// function CompoundModal(props) {
//   const {
//     isVisible,
//     setIsVisible,
//     rewardRouterAddress,
//     active,
//     account,
//     library,
//     chainId,
//     setPendingTxns,
//     totalVesterRewards,
//     nativeTokenSymbol,
//     wrappedTokenSymbol,
//   } = props;
//   const [isCompounding, setIsCompounding] = useState(false);
//   const [shouldClaimGmx, setShouldClaimGmx] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-compound-should-claim-gmx"],
//     true
//   );
//   const [shouldStakeGmx, setShouldStakeGmx] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-compound-should-stake-gmx"],
//     true
//   );
//   const [shouldClaimEsGmx, setShouldClaimEsGmx] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-compound-should-claim-es-gmx"],
//     true
//   );
//   const [shouldStakeEsGmx, setShouldStakeEsGmx] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-compound-should-stake-es-gmx"],
//     true
//   );
//   const [shouldStakeMultiplierPoints, setShouldStakeMultiplierPoints] = useState(true);
//   const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-compound-should-claim-weth"],
//     true
//   );
//   const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
//     [chainId, "StakeV2-compound-should-convert-weth"],
//     true
//   );

//   const gmxAddress = getContract(chainId, "GMX");
//   const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");

//   const [isApproving, setIsApproving] = useState(false);

//   const { data: tokenAllowance } = useSWR(
//     active && [active, chainId, gmxAddress, "allowance", account, stakedGmxTrackerAddress],
//     {
//       fetcher: fetcher(library, Token),
//     }
//   );

//   const needApproval = shouldStakeGmx && tokenAllowance && totalVesterRewards && totalVesterRewards.gt(tokenAllowance);

//   const isPrimaryEnabled = () => {
//     return !isCompounding && !isApproving && !isCompounding;
//   };

//   const getPrimaryText = () => {
//     if (isApproving) {
//       return `Approving GMX...`;
//     }
//     if (needApproval) {
//       return `Approve GMX`;
//     }
//     if (isCompounding) {
//       return "Compounding...";
//     }
//     return "Compound";
//   };

//   const onClickPrimary = () => {
//     if (needApproval) {
//       approveTokens({
//         setIsApproving,
//         library,
//         tokenAddress: gmxAddress,
//         spender: stakedGmxTrackerAddress,
//         chainId,
//       });
//       return;
//     }

//     setIsCompounding(true);

//     const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
//     callContract(
//       chainId,
//       contract,
//       "handleRewards",
//       [
//         shouldClaimGmx || shouldStakeGmx,
//         shouldStakeGmx,
//         shouldClaimEsGmx || shouldStakeEsGmx,
//         shouldStakeEsGmx,
//         shouldStakeMultiplierPoints,
//         shouldClaimWeth || shouldConvertWeth,
//         shouldConvertWeth,
//       ],
//       {
//         sentMsg: "Compound submitted!",
//         failMsg: "Compound failed.",
//         successMsg: "Compound completed!",
//         setPendingTxns,
//       }
//     )
//       .then(async (res) => {
//         setIsVisible(false);
//       })
//       .finally(() => {
//         setIsCompounding(false);
//       });
//   };

//   const toggleShouldStakeGmx = (value) => {
//     if (value) {
//       setShouldClaimGmx(true);
//     }
//     setShouldStakeGmx(value);
//   };

//   const toggleShouldStakeEsGmx = (value) => {
//     if (value) {
//       setShouldClaimEsGmx(true);
//     }
//     setShouldStakeEsGmx(value);
//   };

//   const toggleConvertWeth = (value) => {
//     if (value) {
//       setShouldClaimWeth(true);
//     }
//     setShouldConvertWeth(value);
//   };

//   return (
//     <div className="StakeModal">
//       <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Compound Rewards">
//         <div className="CompoundModal-menu">
//           <div>
//             <Checkbox
//               isChecked={shouldStakeMultiplierPoints}
//               setIsChecked={setShouldStakeMultiplierPoints}
//               disabled={true}
//             >
//               Stake Multiplier Points
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldClaimGmx} setIsChecked={setShouldClaimGmx} disabled={shouldStakeGmx}>
//               Claim GMX Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldStakeGmx} setIsChecked={toggleShouldStakeGmx}>
//               Stake GMX Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldClaimEsGmx} setIsChecked={setShouldClaimEsGmx} disabled={shouldStakeEsGmx}>
//               Claim esGMX Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldStakeEsGmx} setIsChecked={toggleShouldStakeEsGmx}>
//               Stake esGMX Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
//               Claim {wrappedTokenSymbol} Rewards
//             </Checkbox>
//           </div>
//           <div>
//             <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
//               Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
//             </Checkbox>
//           </div>
//         </div>
//         <div className="Exchange-swap-button-container">
//           <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
//             {getPrimaryText()}
//           </button>
//         </div>
//       </Modal>
//     </div>
//   );
// }
