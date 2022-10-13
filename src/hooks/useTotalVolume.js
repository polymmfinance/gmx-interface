import useSWR from "swr";
import {
  ARBITRUM,
  arrayURLFetcher,
  AVALANCHE,
  bigNumberify,
  getServerUrl,
  getTotalVolumeSum,
  POLYGON,
  CRONOS,
} from "../Helpers";
const ACTIVE_CHAIN_IDS = [POLYGON, CRONOS];

export default function useTotalVolume() {
  const { data: totalVolume } = useSWR(
    ACTIVE_CHAIN_IDS.map((chain) => getServerUrl(chain, "/total_volume")),
    {
      fetcher: arrayURLFetcher,
    }
  );
  if (totalVolume?.length > 0) {
    return ACTIVE_CHAIN_IDS.reduce(
      (acc, chainId, index) => {
        const sum = getTotalVolumeSum(totalVolume[index]);
        acc[chainId] = sum;
        acc.total = acc.total.add(sum);
        // console.log(acc)
        return acc;
      },
      { total: bigNumberify(0) }
    );
  }
}
