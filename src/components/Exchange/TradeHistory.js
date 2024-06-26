import React, { useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Tooltip from "../../components/Tooltip/Tooltip";

import {
  USD_DECIMALS,
  MAX_LEVERAGE,
  BASIS_POINTS_DIVISOR,
  LIQUIDATION_FEE,
  formatAmount,
  getExplorerUrl,
  formatDateTime,
  deserialize,
  getExchangeRateDisplay,
  bigNumberify,
} from "../../Helpers";
import { useTrades, useLiquidationsData, useTradesFromGraph } from "../../Api";
import { getContract } from "../../Addresses";

import "./TradeHistory.css";

const { AddressZero } = ethers.constants;

function getPositionDisplay(increase, indexToken, isLong, sizeDelta) {
  const symbol = indexToken ? (indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol) : "";
  return `
    ${increase ? "Increase" : "Decrease"} ${symbol} ${isLong ? "Long" : "Short"}
    ${increase ? "+" : "-"}${formatAmount(sizeDelta, USD_DECIMALS, 2, true)} USD`;
}

function getOrderActionTitle(action) {
  let actionDisplay;

  if (action.startsWith("Create")) {
    actionDisplay = "Create";
  } else if (action.startsWith("Cancel")) {
    actionDisplay = "Cancel";
  } else {
    actionDisplay = "Update";
  }

  return `${actionDisplay} Order`;
}

function renderLiquidationTooltip(liquidationData, label) {
  const minCollateral = liquidationData.size.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE);
  const text =
    liquidationData.type === "full"
      ? "This position was liquidated as the max leverage of 100x was exceeded"
      : "Max leverage of 100x was exceeded, the remaining collateral after deducting losses and fees have been sent back to your account";
  return (
    <Tooltip
      position="left-top"
      handle={label}
      renderContent={() => (
        <>
          {text}
          <br />
          <br />
          Initial collateral: ${formatAmount(liquidationData.collateral, USD_DECIMALS, 2, true)}
          <br />
          Min required collateral: ${formatAmount(minCollateral, USD_DECIMALS, 2, true)}
          <br />
          Borrow fee: ${formatAmount(liquidationData.borrowFee, USD_DECIMALS, 2, true)}
          <br />
          PnL: -${formatAmount(liquidationData.loss, USD_DECIMALS, 2, true)}
          {liquidationData.type === "full" && <div>Liquidation fee: ${formatAmount(LIQUIDATION_FEE, 30, 2, true)}</div>}
        </>
      )}
    />
  );
}

function getLiquidationData(liquidationsDataMap, key, timestamp) {
  return liquidationsDataMap && liquidationsDataMap[`${key}:${timestamp}`];
}

function parseActionLongShort(action) {
  if (action === "DecreasePosition-Long" || action === "IncreasePosition-Long" || action === "LiquidatePosition-Long") {
    return true; // This means we are long
  } else return false;
}

export default function TradeHistory(props) {
  const { account, infoTokens, getTokenInfo, chainId, nativeTokenAddress } = props;
  // const { trades, updateTrades } = useTrades(chainId, account, props.forSingleAccount);
  Object.keys(infoTokens).forEach(k=> infoTokens[k.toLowerCase()] = infoTokens[k]);


  const{ trades, updateTrades } = useTradesFromGraph(chainId, account);

  const liquidationsData = useLiquidationsData(chainId, account);
  const liquidationsDataMap = useMemo(() => {
    if (!liquidationsData) {
      return null;
    }
    return liquidationsData.reduce((memo, item) => {
      const liquidationKey = `${item.key}:${item.timestamp}`;
      memo[liquidationKey] = item;
      return memo;
    }, {});
  }, [liquidationsData]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTrades(undefined, true);
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, [updateTrades]);

  const getMsg = useCallback(
    (trade) => {
      const tradeData = trade;
      const params = JSON.parse(tradeData.params);
      const isLong = parseActionLongShort(trade.action);

      const defaultMsg = "";
      // debugger

      if (tradeData.action === "BuyUSDG") {
        const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress);
        if (!token) {
          return defaultMsg;
        }
        return `Swap ${formatAmount(params.tokenAmount, token.decimals, 4, true)} ${token.symbol} for ${formatAmount(
          params.usdgAmount,
          18,
          4,
          true
        )} USDG`;
      }

      if (tradeData.action === "SellUSDG") {
        const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress);
        if (!token) {
          return defaultMsg;
        }
        return `Swap ${formatAmount(params.usdgAmount, 18, 4, true)} USDG for ${formatAmount(
          params.tokenAmount,
          token.decimals,
          4,
          true
        )} ${token.symbol}`;
      }

      if (tradeData.action === "Swap") {
        const tokenIn = getTokenInfo(infoTokens, params.tokenIn, true, nativeTokenAddress);
        const tokenOut = getTokenInfo(infoTokens, params.tokenOut, true, nativeTokenAddress);
        if (!tokenIn || !tokenOut) {
          return defaultMsg;
        }
        return `Swap ${formatAmount(params.amountIn, tokenIn.decimals, 4, true)} ${tokenIn.symbol} for ${formatAmount(
          params.amountOut,
          tokenOut.decimals,
          4,
          true
        )} ${tokenOut.symbol}`;
      }

      if (tradeData.action === "CreateIncreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return `Request deposit into ${indexToken.symbol} ${isLong ? "Long" : "Short"}`;
        }

        return `Request increase ${indexToken.symbol} ${isLong ? "Long" : "Short"}, +${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, Acceptable Price: ${isLong ? "<" : ">"} ${formatAmount(
          params.acceptablePrice,
          USD_DECIMALS,
          indexToken.displayDecimals,
          true
        )} USD`;
      }

      if (tradeData.action === "CreateDecreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return `Request withdrawal from ${indexToken.symbol} ${isLong ? "Long" : "Short"}`;
        }

        return `Request decrease ${indexToken.symbol} ${isLong ? "Long" : "Short"}, -${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, Acceptable Price: ${isLong ? ">" : "<"} ${formatAmount(
          params.acceptablePrice,
          USD_DECIMALS,
          indexToken.displayDecimals,
          true
        )} USD`;
      }

      if (tradeData.action === "CancelIncreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return (
            <>
              Could not execute deposit into {indexToken.symbol} {isLong ? "Long" : "Short"}
            </>
          );
        }

        return (
          <>
            Could not increase {indexToken.symbol} {isLong ? "Long" : "Short"},
            {`+${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)}`} USD, Acceptable Price:&nbsp;
            {isLong ? "<" : ">"}&nbsp;
            <Tooltip
              position="left-top"
              handle={`${formatAmount(params.acceptablePrice, USD_DECIMALS, indexToken.displayDecimals, true)} USD`}
              renderContent={() => <>Try increasing the "Allowed Slippage", under the Settings menu on the top right</>}
            />
          </>
        );
      }

      if (tradeData.action === "CancelDecreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta).eq(0)) {
          return `Could not execute withdrawal from ${indexToken.symbol} ${isLong ? "Long" : "Short"}`;
        }

        return (
          <>
            Could not decrease {indexToken.symbol} {isLong ? "Long" : "Short"},
            {`+${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)}`} USD, Acceptable Price:&nbsp;
            {isLong ? ">" : "<"}&nbsp;
            <Tooltip
              position="left-top"
              handle={`${formatAmount(params.acceptablePrice, USD_DECIMALS, indexToken.displayDecimals, true)} USD`}
              renderContent={() => <>Try increasing the "Allowed Slippage", under the Settings menu on the top right</>}
            />
          </>
        );
      }

      if (tradeData.action === "IncreasePosition-Long" || tradeData.action === "IncreasePosition-Short") {
        if (params.flags?.isOrderExecution) {
          return;
        }

        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }
        if (bigNumberify(params.sizeDelta).eq(0)) {
          return `Deposit ${formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD into ${
            indexToken.symbol
          } ${isLong ? "Long" : "Short"}`;
        }
        return `Increase ${indexToken.symbol} ${isLong ? "Long" : "Short"}, +${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, indexToken.displayDecimals, true)} USD`;
      }

      if (tradeData.action === "DecreasePosition-Long" || tradeData.action === "DecreasePosition-Short") {
        if (params.flags?.isOrderExecution) {
          return;
        }

        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }
        if (bigNumberify(params.sizeDelta).eq(0)) {
          return `Withdraw ${formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD from ${
            indexToken.symbol
          } ${isLong ? "Long" : "Short"}`;
        }
        const isLiquidation = params.flags?.isLiquidation;
        const liquidationData = getLiquidationData(liquidationsDataMap, params.key, tradeData.timestamp);

        if (isLiquidation && liquidationData) {
          return (
            <>
              {renderLiquidationTooltip(liquidationData, "Partial Liquidation")} {indexToken.symbol}{" "}
              {isLong ? "Long" : "Short"}, -{formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,{" "}
              {indexToken.symbol}&nbsp; Price: ${formatAmount(params.price, USD_DECIMALS, indexToken.displayDecimals, true)} USD
            </>
          );
        }
        const actionDisplay = isLiquidation ? "Partially Liquidated" : "Decreased";
        return `
        ${actionDisplay} ${indexToken.symbol} ${isLong ? "Long" : "Short"},
        -${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, indexToken.displayDecimals, true)} USD
      `;
      }

      if (tradeData.action === "LiquidatePosition-Long" || tradeData.action === "LiquidatePosition-Short") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }
        const liquidationData = getLiquidationData(liquidationsDataMap, params.key, tradeData.timestamp);
        if (liquidationData) {
          return (
            <>
              {renderLiquidationTooltip(liquidationData, "Liquidated")} {indexToken.symbol}{" "}
              {isLong ? "Long" : "Short"}, -{formatAmount(params.size, USD_DECIMALS, 2, true)} USD,&nbsp;
              {indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, indexToken.displayDecimals, true)} USD
            </>
          );
        }
        return `
        Liquidated ${indexToken.symbol} ${isLong ? "Long" : "Short"},
        -${formatAmount(params.size, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, indexToken.displayDecimals, true)} USD
      `;
      }

      if (["ExecuteIncreaseOrder", "ExecuteDecreaseOrder"].includes(tradeData.action)) {
        const order = deserialize(params.order);
        const indexToken = getTokenInfo(infoTokens, order.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }
        const longShortDisplay = order.isLong ? "Long" : "Short";
        const executionPriceDisplay = formatAmount(order.executionPrice, USD_DECIMALS, indexToken.displayDecimals, true);
        const sizeDeltaDisplay = `${order.type === "Increase" ? "+" : "-"}${formatAmount(
          order.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )}`;

        return `
        Execute Order: ${order.type} ${indexToken.symbol} ${longShortDisplay}
        ${sizeDeltaDisplay} USD, Price: ${executionPriceDisplay} USD
      `;
      }

      if (
        [
          "CreateIncreaseOrder",
          "CancelIncreaseOrder",
          "UpdateIncreaseOrder",
          "CreateDecreaseOrder",
          "CancelDecreaseOrder",
          "UpdateDecreaseOrder",
        ].includes(tradeData.action)
      ) {
        const order = deserialize(params.order);
        const indexToken = getTokenInfo(infoTokens, order.indexToken);
        if (!indexToken) {
          return defaultMsg;
        }
        const increase = tradeData.action.includes("Increase");
        const priceDisplay = `${order.triggerAboveThreshold ? ">" : "<"} ${formatAmount(
          order.triggerPrice,
          USD_DECIMALS,
          indexToken.displayDecimals,
          true
        )}`;
        return `
        ${getOrderActionTitle(tradeData.action)}:
        ${getPositionDisplay(increase, indexToken, order.isLong, order.sizeDelta)},
        Price: ${priceDisplay}
      `;
      }

      if (tradeData.action === "ExecuteSwapOrder") {
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        // const fromToken = getTokenInfo(infoTokens, params.fromToken === nativeTokenAddress ? AddressZero : params.fromToken);
        // const toToken = getTokenInfo(infoTokens, params.shouldUnwrap ? AddressZero : params.toToken);
        const fromToken = {symbol:""}
        const toToken = {symbol:""}
        if (!fromToken || !toToken) {
          return defaultMsg;
        }
        const fromAmountDisplay = formatAmount(params.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true);
        const toAmountDisplay = formatAmount(params.amountOut, toToken.decimals, toToken.isStable ? 2 : 4, true);
        return `
        Execute Order: Swap ${fromAmountDisplay} ${fromToken.symbol} for ${toAmountDisplay} ${toToken.symbol}
      `;
      }

      if (["CreateSwapOrder", "UpdateSwapOrder", "CancelSwapOrder"].includes(tradeData.action)) {
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        // const fromToken = getTokenInfo(infoTokens, params.fromToken === nativeTokenAddress ? AddressZero : params.fromToken);
        // const toToken = getTokenInfo(infoTokens, params.shouldUnwrap ? AddressZero : params.toToken);
        const fromToken = {symbol:""}
        const toToken = {symbol:""}
        if (!fromToken || !toToken) {
          return defaultMsg;
        }
        const amountInDisplay = fromToken
          ? formatAmount(params.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true)
          : "";
        const minOutDisplay = toToken
          ? formatAmount(params.minOut, toToken.decimals, toToken.isStable ? 2 : 4, true)
          : "";

        return `
        ${getOrderActionTitle(tradeData.action)}:
        Swap ${amountInDisplay} ${fromToken?.symbol || ""} for ${minOutDisplay} ${toToken?.symbol || ""},
        Price: ${getExchangeRateDisplay(params.triggerRatio, fromToken, toToken)}`;
      }
    },
    [getTokenInfo, infoTokens, nativeTokenAddress, chainId, liquidationsDataMap]
  );

  const tradesWithMessages = useMemo(() => {
    if (!trades) {
      return [];
    }

    return trades.data.actionDatas.map((trade) => ({
        msg: getMsg(trade),
        ...trade,
      }))
      .filter((trade) => trade.msg);
  }, [trades, getMsg]);
  // console.log(tradesWithMessages)
  return (
    <div className="TradeHistory">
      {tradesWithMessages.length === 0 && <div className="TradeHistory-row App-box">No trades yet</div>}
      {tradesWithMessages.length > 0 &&
        tradesWithMessages.map((trade, index) => {
          const tradeData = trade
          const txUrl = getExplorerUrl(chainId) + "tx/" + tradeData.txhash;

          let msg = getMsg(trade);

          if (!msg) {
            return null;
          }

          return (
            <div className="TradeHistory-row App-box App-box-border" key={index}>
              <div>
                <div className="muted TradeHistory-time">
                  {formatDateTime(tradeData.timestamp)}
                  {(!account || account.length === 0) && (
                    <span>
                      {" "}
                      (<Link to={`/actions/${tradeData.account}`}>{tradeData.account}</Link>)
                    </span>
                  )}
                </div>
                <a className="plain" href={txUrl} target="_blank" rel="noopener noreferrer">
                  {msg}
                </a>
              </div>
            </div>
          );
        })}
    </div>
  );
}
