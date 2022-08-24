import { useEffect, useState } from "react";
import { encodeReferralCode, getReferralCodeOwner } from "../../Api/referrals";
import { isAddressZero, useDebounce } from "../../Helpers";
import { REFERRAL_CODE_REGEX } from "../Referrals/referralsHelper";

export function RegisterTeamForm({ chainId }) {
  const [name, setName] = useState("");

  const [code, setCode] = useState("");
  const debouncedCode = useDebounce(code, 300);
  const [codeDoesntExist, setCodeDoesntExist] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);

  const getButtonText = () => {
    if (debouncedCode === "") {
      return "Enter team details";
    }

    if (validatingCode) {
      return "Checking referral code...";
    }

    if (codeDoesntExist) {
      return "This referral code does not exist";
    }

    return "Create Team";
  };

  // Code validation
  useEffect(() => {
    async function main() {
      setValidatingCode(true);

      if (debouncedCode === "" || !REFERRAL_CODE_REGEX.test(debouncedCode)) {
        setCodeDoesntExist(true);
      } else {
        const owner = await getReferralCodeOwner(chainId, encodeReferralCode(debouncedCode));
        setCodeDoesntExist(isAddressZero(owner));
      }

      setValidatingCode(false);
    }

    main();
  }, [debouncedCode, chainId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    alert("Do submit");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">Register you team</h2>
      <p className="subtitle">
        Register you team by submiting the details,
        <br />
        you will be able to share the invite link after.
      </p>
      <div className="mt-large">
        <div>
          <input
            autoFocus
            className="input"
            value={name}
            onChange={({ target }) => setName(target.value)}
            placeholder="Team name"
          />
        </div>
        <div>
          <input
            className="input"
            value={code}
            onChange={({ target }) => setCode(target.value)}
            placeholder="Referral code"
          />
        </div>
      </div>
      <button type="submit" className="App-cta Exchange-swap-button mt-medium">
        {getButtonText()}
      </button>
    </form>
  );
}
