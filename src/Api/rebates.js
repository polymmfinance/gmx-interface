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
  PLACEHOLDER_ACCOUNT,
} from "../Helpers";
import { arbitrumReferralsGraphClient, avalancheReferralsGraphClient, polygonReferralGraphClient } from "./common";
import { getContract } from "../Addresses";
import { callContract } from ".";
import { REGEX_VERIFY_BYTES32 } from "../components/Referrals/referralsHelper";

const ACTIVE_CHAINS = [POLYGON];
const DISTRIBUTION_TYPE_REBATES = "1";
const DISTRIBUTION_TYPE_DISCOUNT = "2";

function getGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === POLYGON) {
    // TODO: @jerry need replace this referral graph client
    return polygonReferralGraphClient
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
    rebateAddress, account, chainId, balance,
    deductMMF,
    enableFeature,
  })
  return {
    balance,
    deductMMF,
    enableFeature,
    loading: !balance && !deductMMF && !enableFeature
  };
}
