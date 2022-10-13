import { gql } from "@apollo/client";
import { ethers } from "ethers";
import { getContract } from "../Addresses";
import { bigNumberify, formatAmount, getServerUrl, POLYGON, CRONOS } from "../Helpers";
import {
  polygonRebatesClient,
  polygonVaultActionGraphClient,
  cronosRebatesClient,
  cronosVaultActionGraphClient,
} from "./common";
import erc20 from "../abis/erc20.json";
import BigNumber from "bignumber.js";

function getPreviousWednesdayEnd(offsetWeek) {
  const x = new Date();
  const date = new Date();

  x.setDate(date.getDate() - offsetWeek * 7 - ((date.getDay() + 3) % 7));

  return x.setUTCHours(0, 0, 0, 0);
}

function getTradingDiscount(balance) {
  const walletBalanceBN = new BigNumber(balance);
  const BIG_TEN = new BigNumber(10);

  if (walletBalanceBN.gte(new BigNumber(100000))) {
    return 50; // 50%
  }
  if (walletBalanceBN.gte(new BigNumber(50000))) {
    return 30;
  }
  if (walletBalanceBN.gte(new BigNumber(20000))) {
    return 15;
  }
  if (walletBalanceBN.gte(new BigNumber(10000))) {
    return 5; // 5%
  }
  return 0;
}

function generateUserRebatesQueries(n) {
  let data = [];
  for (let i = 0; i < n + 1; i++) {
    let query = gql(
      `${`{
      userRebates(orderBy: timestamp, skip: ${i * 100}) {
        address
        state
        timestamp
      }
  }`}`
    );
    data.push(query);
  }
  return data;
}

function generateUserFeesQueries(n, from, to) {
  let data = [];
  for (let i = 0; i < n + 1; i++) {
    let query = gql(
      `${`{
    feeStatByUsers(
      first: 100,
      orderBy: id,
      orderDirection: desc,
      skip: ${i * 100},
      where: { period: daily, timestamp_gte: ${from}, timestamp_lte: ${to}, margin_gt: 0},
    ) {
      margin
      address
    }
}`}`
    );
    data.push(query);
  }
  return data;
}

async function generateUserFeesQueriesByAddress(n, from, to, address) {
  let query = gql(
    `${`{
    feeStatByUsers(
      orderBy: id,
      orderDirection: desc,
      where: { period: daily, timestamp_gte: ${from}, timestamp_lte: ${to}, address: ${address} },
    ) {
      margin
      address
    }
}`}`
  );
  //TODO: Refactor to Chain Agnostic
  let data = await polygonVaultActionGraphClient.query({ query: query });
  return data;
}

window.generateUserFeesQueriesByAddress = generateUserFeesQueriesByAddress;

// all users with toggle feature on
async function getAllStates() {
  const queries = generateUserRebatesQueries(3);
  //TODO: Refactor to Chain Agnostic
  let data = await Promise.all(queries.map((x) => polygonRebatesClient.query({ query: x })));
  data = data.map((x) => x.data.userRebates).flatMap((x) => x);
  // console.log(data)
  return data;
}

// all users with toggle feature on
async function getFeesAccumulated(users, obj) {
  const urls = users.map((x) => getServerUrl(27, `/fees_by_user?user=${x}&offsetweek=${1}`));
  let data = await Promise.all(urls.map((x) => fetch(x)))
    .then((res) => {
      return Promise.all(res.map((x) => x.json()));
    })
    .then((res) => {
      return res;
    })
    .catch(console.error);

  users.forEach((x, i) => {
    obj[x].fees = data[i].total;
  });
  return obj;
}

// Get fees for all users
// NOTE: we don't have many users right now, this query will run faster than above
async function getFeesAccumulatedBySubgraph(offsetweek = 1) {
  // const from = parseInt(getPreviousWednesdayEnd(offsetweek) / 1000)
  let date = new Date(2022, 8, 12);
  const from = parseInt(date.setUTCHours(0, 0, 0, 0)) / 1000;
  console.log(from);

  let to = parseInt(Date.now() / 1000);
  if (offsetweek > 0) {
    to = parseInt(getPreviousWednesdayEnd(offsetweek - 1) / 1000);
  }

  // This parameter represents the expected number of API calls required
  const expectedUsersAverage = 50;
  const queries = generateUserFeesQueries(expectedUsersAverage, from, to);
  //TODO: Refactor to Chain Agnostic
  let data = await Promise.all(queries.map((x) => polygonVaultActionGraphClient.query({ query: x })));
  if (data.length > expectedUsersAverage * 90) {
    console.warn("Please increase the expectedUsersAverage");
  }
  data = data.map((x) => x.data.feeStatByUsers).flatMap((x) => x);
  console.log(data);
  return data;
}

async function getAllMMFHoldings(obj) {
  const provider = new ethers.providers.JsonRpcProvider("https://rpc-mainnet.maticvigil.com");
  //TODO: Refactor to Chain Agnostic
  const rebateAddress = getContract(POLYGON, "TradingFeeRebates");
  const contract = new ethers.Contract(rebateAddress, erc20, provider);
  const keys = Object.keys(obj);
  console.log("getttings MMF balance of users:", keys.length);
  let balance = await Promise.all(keys.map((x) => contract.balanceOf(x)));
  balance.forEach((x, index) => {
    let t = bigNumberify(x).div(bigNumberify(10).pow(18)).toString(10);
    obj[keys[index]] = {
      ...obj[keys[index]],
      mmfBalance: t,
      tier: getTradingDiscount(t),
      discount: (getTradingDiscount(t) / 100) * obj[keys[index]].marginFees,
    };
  });
  return obj;
}

async function currentUserStates() {
  let data = await getAllStates();
  let obj = {};
  data.forEach((x) => {
    obj[x.address] = {
      address: x.address,
      lastState: x.state,
      marginFees: 0,
    };
  });

  // This path uses the data from server
  // // let length = data.length;
  // let length = 1;
  // for (let i = 0; i < length / 10; i++) {
  //   await getFeesAccumulated(Object.keys(obj).slice(0 + i * 10, 10 + i * 10), obj);
  // }

  data = await getFeesAccumulatedBySubgraph();

  // filter users with >0 fees
  let obj2 = {};
  data.forEach((x) => {
    // add only if user has toggle on
    if (obj[x.address]) {
      let oldfees = (obj2[x.address] && obj2[x.address].marginFees) || new BigNumber(0);
      obj2[x.address] = {
        address: x.address,
        lastState: obj[x.address].lastState,
        marginFees: new BigNumber(oldfees).plus(new BigNumber(formatAmount(x.margin, 30))).toString(),
        mmfBalance: 0,
      };
    }
  });
  obj = obj2;

  // get MMF holdings for all above users
  data = await getAllMMFHoldings(obj);

  const finalObj = Object.keys(data).map((key) => {
    return data[key];
  });

  console.log(JSON.stringify(finalObj));
  return finalObj;
}

window.currentUserStates = currentUserStates;
export default currentUserStates;
