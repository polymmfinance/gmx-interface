import { bigNumberify, getInfoTokens, getNextToAmount, getServerUrl, PLACEHOLDER_ACCOUNT } from "../src/Helpers";
import VaultV2 from "../src/abis/VaultV2.json";
import ReaderV2 from "../src/abis/ReaderV2.json";
import { ethers } from "ethers";
import { getContract } from "../src/Addresses";
import { getTokens, getWhitelistedTokens } from "../src/data/Tokens";

const vaultAddress = "0xE990519F19DCc6c1589A544C331c4Ec046593e7A";
const readerAddress = "0x6c563835B6208e0482336d404F5CAD572BEbe76B";
const provider = new ethers.providers.StaticJsonRpcProvider("https://polygon-rpc.com", { chainId });

export default async function handler(req, res) {
    // res.setHeader('Cache-Control', 's-maxage=86400');
    const { chainId = 137, fromAmount, fromTokenAddress, toTokenAddress } = req.query;
    const glpAddress = getContract(chainId, "MLP");
    const usdgAddress = getContract(chainId, "USDG");

    const tokens = getTokens(chainId);
    const vaultReaderAddress = getContract(chainId, "VaultReader");
    const vaultAddress = getContract(chainId, "Vault");
    const positionRouterAddress = getContract(chainId, "PositionRouter");
    const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

    const whitelistedTokens = getWhitelistedTokens(chainId);
    const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
    const tokenAddresses = tokens.map((token) => token.address);

    const tokensForBalanceAndSupplyQuery = [glpAddress, usdgAddress];
    const vaultReaderContract = new ethers.Contract(readerAddress, ReaderV2, provider);
    const vaultContract = new ethers.Contract(vaultAddress, VaultV2, provider);
    const readerContract = new ethers.Contract(readerAddress, ReaderV2, provider);
    const totalTokenWeights = await vaultContract.totalTokenWeights()
    const balancesAndSupplies = await readerContract.getTokenBalancesWithSupplies(PLACEHOLDER_ACCOUNT, tokensForBalanceAndSupplyQuery);
    const tokenBalances = await readerContract.getTokenBalances(PLACEHOLDER_ACCOUNT, tokenAddresses);
    const vaultTokenInfo = await vaultReaderContract.getVaultTokenInfoV4(vaultAddress, positionRouterAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses);

    const usdgSupply = balancesAndSupplies ? balancesAndSupplies[3] : bigNumberify(0);



    // const { data: tokenBalances } = useSWR(
    //     [`GlpSwap:getTokenBalances:${active}`, chainId, readerAddress, "getTokenBalances", account || PLACEHOLDER_ACCOUNT],
    //     {
    //       fetcher: fetcher(library, ReaderV2, [tokenAddresses]),
    //     }
    //   );
    // const { data: vaultTokenInfo } = useSWR(
    //     [`useInfoTokens:${active}`, chainId, vaultReaderAddress, "getVaultTokenInfoV4"],
    //     {
    //       fetcher: fetcher(library, VaultReader, [
    //         vaultAddress,
    //         positionRouterAddress,
    //         nativeTokenAddress,
    //         expandDecimals(1, 18),
    //         whitelistedTokenAddresses,
    //       ]),
    //     }
    //   );

    // console.log(vaultTokenInfo)
    // const vaultTokenInfo = []
    const indexPricesUrl = getServerUrl(chainId, "/prices");
    const res = await fetch(indexPricesUrl)
    const indexPrices = await res.json();

    const infoTokens = getInfoTokens(
        tokens,
        tokenBalances,
        whitelistedTokens,
        vaultTokenInfo,
        undefined,
        undefined,
        indexPrices,
        nativeTokenAddress
    );

    //   const { data: indexPrices } = useSWR([indexPricesUrl], {
    //     fetcher: (...args) => fetch(...args).then((res) => res.json()),
    //     refreshInterval: 500,
    //     refreshWhenHidden: true,
    //   });
    // const { data: balancesAndSupplies } = useSWR(
    //     [
    //       `GlpSwap:getTokenBalancesWithSupplies:${active}`,
    //       chainId,
    //       readerAddress,
    //       "getTokenBalancesWithSupplies",
    //       account || PLACEHOLDER_ACCOUNT,
    //     ],
    //     {
    //       fetcher: fetcher(library, ReaderV2, [tokensForBalanceAndSupplyQuery]),
    //     }
    //   );


    const { feeBasisPoints } = getNextToAmount(
        chainId,
        fromAmount,
        fromTokenAddress,
        toTokenAddress,
        infoTokens,
        undefined,
        undefined,
        usdgSupply,
        totalTokenWeights,
        true
    );
    if (feeBasisPoints !== undefined) {
        fees = fromAmount.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
        const feeTokenPrice =
            fromTokenInfo.address === USDG_ADDRESS ? expandDecimals(1, USD_DECIMALS) : fromTokenInfo.maxPrice;
        feesUsd = fees.mul(feeTokenPrice).div(expandDecimals(1, fromTokenInfo.decimals));
    }
    feeBps = feeBasisPoints;

    console.log(feeBps);

    res.status(200).json({ feeBps: feeBps.toString(), feesUsd: feesUsd.toString(), fees: fees.toString() });
}