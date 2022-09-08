import { useEffect, useRef, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { approveTokens, fetcher, useDebounce, formatAmount } from "../../Helpers";
import { withdrawMMF } from "../../Api/rebates";
import Token from "../../abis/Token.json";
import { getContract } from "../../Addresses";
import useSWR from "swr";
import { BigNumber } from "ethers";
import { BIG_TEN } from "../../Api";

function WithdrawAmountForm({ setPendingTxns, pendingTxns, active, connectWallet, callAfterSuccess, walletBalance }) {
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">Enter Withdraw Amount</h2>
      <p className="sub-title">Please input an amount to withdraw from funding wallet.</p>
      <div className="card-action">
        {active ? (
          <WithdrawAmountFormComponent
            setPendingTxns={setPendingTxns}
            pendingTxns={pendingTxns}
            callAfterSuccess={callAfterSuccess}
            walletBalance={walletBalance}
          />
        ) : (
          <button className="App-cta Exchange-swap-button" type="submit" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export function WithdrawAmountFormComponent({
  setPendingTxns,
  pendingTxns,
  callAfterSuccess,
  userReferralCodeString = "",
  walletBalance,
}) {
  const { active, account, library, chainId } = useWeb3React();
  const mmfAddress = getContract(chainId, "MMF");
  const rebatesAddress = getContract(chainId, "TradingFeeRebates");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const inputRef = useRef("");
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedReferralCode = useDebounce(withdrawAmount, 300);

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR(
    [active, chainId, mmfAddress, "allowance", account, rebatesAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const needApproval = !tokenAllowance?.gt?.(0) ?? true;

  function getPrimaryText() {
    if (isSubmitting) {
      return "Withdrawing...";
    }
    if (debouncedReferralCode === "") {
      return "Enter Withdraw Amount";
    }

    if (isApproving) {
      return "Approving...";
    }

    if (needApproval) {
      return "Allow MMF Spend";
    }

    return "Submit";
  }
  function isPrimaryEnabled() {
    if (debouncedReferralCode === "" || isSubmitting || debouncedReferralCode === userReferralCodeString) {
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (needApproval) {
      return approveTokens({
        setIsApproving,
        library,
        tokenAddress: mmfAddress,
        spender: rebatesAddress,
        chainId: chainId,
        onApproveSubmitted: () => {
          setIsApproving(false);
          updateTokenAllowance();
        },
      });
    }

    try {
      setIsSubmitting(true);
      const tx = await withdrawMMF(chainId, BigNumber.from(withdrawAmount).mul(BIG_TEN.pow(18).toString()), library, {
        account,
        successMsg: "Withdrawn MMF!",
        failMsg: "Failed to withdraw MMF",
        setPendingTxns,
        pendingTxns,
      });
      if (callAfterSuccess) {
        callAfterSuccess();
      }
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setWithdrawAmount("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div className="muted align-right"> Balance: {formatAmount(walletBalance, 18, 4, true)}</div>
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="number"
        placeholder="Enter withdraw amount"
        className="text-input mb-sm"
        value={withdrawAmount}
        onChange={({ target }) => {
          const { value } = target;
          setWithdrawAmount(value);
        }}
      />
      <button type="submit" className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()}>
        {getPrimaryText()}
      </button>
    </form>
  );
}
export default WithdrawAmountForm;
