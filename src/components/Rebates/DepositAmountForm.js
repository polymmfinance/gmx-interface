import { useEffect, useRef, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { useDebounce } from "../../Helpers";
import { depositMMF } from "../../Api/rebates";

function DepositAmountForm({ setPendingTxns, pendingTxns, active, connectWallet }) {
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">Enter Deposit Amount</h2>
      <p className="sub-title">Please input an amount to deposit into funding wallet.</p>
      <div className="card-action">
        {active ? (
          <DepositAmountFormComponent setPendingTxns={setPendingTxns} pendingTxns={pendingTxns} />
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
  const { account, library, chainId } = useWeb3React();
  const [depositAmount, setReferralCode] = useState("");
  const inputRef = useRef("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedReferralCode = useDebounce(depositAmount, 300);

  function getPrimaryText() {
    if (isSubmitting) {
      return "Depositing...";
    }
    if (debouncedReferralCode === "") {
      return "Enter Deposit Amount";
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
    setIsSubmitting(true);

    try {
      const tx = await depositMMF(chainId, depositAmount, library, {
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
        setReferralCode("");
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
          setReferralCode(value);
        }}
      />
      <button type="submit" className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()}>
        {getPrimaryText()}
      </button>
    </form>
  );
}
export default DepositAmountForm;
