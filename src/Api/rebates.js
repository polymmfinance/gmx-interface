import { ethers } from "ethers";
import { gql } from "@apollo/client";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";

import TradingFeeRebates from "../abis/TradingFeeRebates.json";
import ReferralStorage from "../abis/ReferralStorage.json";
import {
  ARBITRUM,
  AVALANCHE,
  MAX_REFERRAL_CODE_LENGTH,
  bigNumberify,
  isAddressZero,
  helperToast,
  getProvider,
  fetcher,
  isHashZero,
  REFERRAL_CODE_KEY,
  POLYGON,
  CRONOS,
  PLACEHOLDER_ACCOUNT,
  getExplorerUrl,
} from "../Helpers";
import {
  arbitrumReferralsGraphClient,
  avalancheReferralsGraphClient,
  polygonReferralGraphClient,
  cronosReferralGraphClient,
} from "./common";
import { getContract } from "../Addresses";
import { callContract } from ".";
import { REGEX_VERIFY_BYTES32 } from "../components/Referrals/referralsHelper";

const ACTIVE_CHAINS = [POLYGON, CRONOS];
const DISTRIBUTION_TYPE_REBATES = "1";
const DISTRIBUTION_TYPE_DISCOUNT = "2";

function getGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === POLYGON) {
    return polygonReferralGraphClient;
  } else if (chainId === CRONOS) {
    return cronosReferralGraphClient;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}

export async function getReferralCodeOwner(chainId, referralCode) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(null, chainId);
  const contract = new ethers.Contract(referralStorageAddress, TradingFeeRebates.abi, provider);
  const codeOwner = await contract.codeOwners(referralCode);
  return codeOwner;
}

export function useReferrerTier(library, chainId, account) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: referrerTier, mutate: mutateReferrerTier } = useSWR(
    account && [`TradingFeeRebates:referrerTiers`, chainId, referralStorageAddress, "referrerTiers", account],
    {
      fetcher: fetcher(library, ReferralStorage),
    }
  );
  return {
    referrerTier,
    mutateReferrerTier,
  };
}

export function useRebatesData(library, chainId, account) {
  const rebateAddress = getContract(chainId, "TradingFeeRebates");
  const { data: balance } = useSWR(
    account && [`TradingFeeRebates:balanceOf`, chainId, rebateAddress, "balanceOf", account],
    {
      fetcher: fetcher(library, TradingFeeRebates),
    }
  );
  const { data: deductMMF } = useSWR(
    account && [`TradingFeeRebates:deductMMF`, chainId, rebateAddress, "deductMMF", account],
    {
      fetcher: fetcher(library, TradingFeeRebates),
    }
  );
  const { data: enableFeature } = useSWR(
    account && [`TradingFeeRebates:enableFeature`, chainId, rebateAddress, "enableFeature", account],
    {
      fetcher: fetcher(library, TradingFeeRebates),
    }
  );

  console.log({
    rebateAddress,
    account,
    chainId,
    balance,
    deductMMF,
    enableFeature,
  });
  return {
    balance,
    deductMMF,
    enableFeature,
    loading: !balance && !deductMMF && !enableFeature,
  };
}

export function toggleEnableFeature({ library, chainId, onSubmitted, enable }) {
  // setIsApproving(true);
  const rebateAddress = getContract(chainId, "TradingFeeRebates");
  const contract = new ethers.Contract(rebateAddress, TradingFeeRebates.abi, library.getSigner());
  contract
    .toggleFeature(enable)
    .then(async (res) => {
      const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
      helperToast.success(
        <div>
          Toggle feature submitted!{" "}
          <a href={txUrl} target="_blank" rel="noopener noreferrer">
            View status.
          </a>
          <br />
        </div>
      );
      if (onSubmitted) {
        onSubmitted();
      }
    })
    .catch((e) => {
      console.error(e);
      let failMsg;
      if (
        ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
          e.data?.message
        )
      ) {
        failMsg = <div>There is not enough gas in your account to send this transaction.</div>;
      } else if (e.message?.includes("User denied transaction signature")) {
        failMsg = "Toggle was cancelled";
      } else {
        failMsg = "Toggle failed";
      }
      helperToast.error(failMsg);
    })
    .finally(() => {
      // setIsApproving(false);
    });
}

export function toggleDeductMMF({ library, chainId, onSubmitted, enable }) {
  // setIsApproving(true);
  const rebateAddress = getContract(chainId, "TradingFeeRebates");
  const contract = new ethers.Contract(rebateAddress, TradingFeeRebates.abi, library.getSigner());
  contract
    .toggleDeductMMF(enable)
    .then(async (res) => {
      const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
      helperToast.success(
        <div>
          Toggle deduct MMF submitted!{" "}
          <a href={txUrl} target="_blank" rel="noopener noreferrer">
            View status.
          </a>
          <br />
        </div>
      );
      if (onSubmitted) {
        onSubmitted();
      }
    })
    .catch((e) => {
      console.error(e);
      let failMsg;
      if (
        ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
          e.data?.message
        )
      ) {
        failMsg = <div>There is not enough gas in your account to send this transaction.</div>;
      } else if (e.message?.includes("User denied transaction signature")) {
        failMsg = "Toggle was cancelled";
      } else {
        failMsg = "Toggle failed";
      }
      helperToast.error(failMsg);
    })
    .finally(() => {
      // setIsApproving(false);
    });
}

export async function depositMMF(chainId, depositAmount, library, opts) {
  const rebateAddress = getContract(chainId, "TradingFeeRebates");
  const contract = new ethers.Contract(rebateAddress, TradingFeeRebates.abi, library.getSigner());

  // if (isAddressZero(codeOwner)) {
  //   const errorMsg = "Referral code does not exist";
  //   helperToast.error(errorMsg);
  //   return Promise.reject(errorMsg);
  // }
  return callContract(chainId, contract, "depositMMF", [depositAmount], opts);
}

export async function withdrawMMF(chainId, withdrawAmount, library, opts) {
  const rebateAddress = getContract(chainId, "TradingFeeRebates");
  const contract = new ethers.Contract(rebateAddress, TradingFeeRebates.abi, library.getSigner());

  // if (isAddressZero(codeOwner)) {
  //   const errorMsg = "Referral code does not exist";
  //   helperToast.error(errorMsg);
  //   return Promise.reject(errorMsg);
  // }
  return callContract(chainId, contract, "withdrawMMF", [withdrawAmount], opts);
}
