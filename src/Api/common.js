import { ApolloClient, InMemoryCache } from "@apollo/client";

export const chainlinkClient = createClient("https://api.thegraph.com/subgraphs/name/deividask/chainlink");
export const arbitrumGraphClient = createClient("https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats");
export const avalancheGraphClient = createClient("https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats");
export const nissohGraphClient = createClient("https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault");
export const arbitrumReferralsGraphClient = createClient(
  "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-referrals"
);
export const avalancheReferralsGraphClient = createClient(
  "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-referrals"
);
export const polygonGraphClient = createClient("https://api.thegraph.com/subgraphs/name/polymmfinance/mlp-orderbook")
export const polygonReferralGraphClient = createClient("https://api.thegraph.com/subgraphs/name/polymmfinance/mlp-referral")
export const polygonVaultActionGraphClient = createClient("https://api.thegraph.com/subgraphs/name/polymmfinance/test-subgraph-mm")
export const polygonRebatesClient = createClient("https://api.thegraph.com/subgraphs/name/polymmfinance/user-rebates")


function createClient(uri) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}
