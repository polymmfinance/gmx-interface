import { useEffect, useRef, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { approveTokens, fetcher, useDebounce } from "../../Helpers";
import { depositMMF } from "../../Api/rebates";
import Token from "../../abis/Token.json";
import { getContract } from "../../Addresses";
import useSWR from "swr";
import { BigNumber } from "ethers";
import { BIG_TEN } from "../../Api";

function DepositAmountForm({ setPendingTxns, pendingTxns, active, connectWallet, callAfterSuccess }) {
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">Enter Deposit Amount</h2>
      <p className="sub-title">Please input an amount to deposit into funding wallet.</p>
      <div className="card-action">
        {active ? (
          <DepositAmountFormComponent setPendingTxns={setPendingTxns} pendingTxns={pendingTxns} callAfterSuccess={callAfterSuccess} />
        ) : (
          <button className="App-cta Exchange-swap-button" type="submit" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export function DepositAmountFormComponent({
  setPendingTxns,
  pendingTxns,
  callAfterSuccess,
  userReferralCodeString = "",
}) {
  const { active, account, library, chainId } = useWeb3React();
  const mmfAddress = getContract(chainId, "MMF");
  const rebatesAddress = getContract(chainId, "TradingFeeRebates");
  const [depositAmount, setDepositAmount] = useState("");
  const inputRef = useRef("");
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedReferralCode = useDebounce(depositAmount, 300);

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR(
    [active, chainId, mmfAddress, "allowance", account, rebatesAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const needApproval = !tokenAllowance?.gt?.(0) ?? true;

  function getPrimaryText() {
    if (isSubmitting) {
      return "Depositing...";
    }
    if (debouncedReferralCode === "") {
      return "Enter Deposit Amount";
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
    if (
      debouncedReferralCode === "" ||
      isSubmitting ||
      debouncedReferralCode === userReferralCodeString
    ) {
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
      const tx = await depositMMF(chainId, BigNumber.from(depositAmount).mul(BIG_TEN.pow(18).toString()), library, {
        account,
        successMsg: "Deposited MMF!",
        failMsg: "Failed to deposit MMF",
        setPendingTxns,
        pendingTxns,
      });
      if (callAfterSuccess) {
        callAfterSuccess();
      }
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setDepositAmount("");
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
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="number"
        placeholder="Enter deposit amount"
        className="text-input mb-sm"
        value={depositAmount}
        onChange={({ target }) => {
          const { value } = target;
          setDepositAmount(value);
        }}
      />
      <button type="submit" className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()}>
        {getPrimaryText()}
      </button>
    </form>
  );
}
export default DepositAmountForm;
