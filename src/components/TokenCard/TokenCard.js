import React, { useCallback } from "react";
import { Link } from "react-router-dom";

import cx from "classnames";

// import gmxBigIcon from "../../img/ic_gmx_custom.svg";
import glpBigIcon from "../../img/ic_glp_custom.svg";

import { ARBITRUM, AVALANCHE, switchNetwork, useChainId, isHomeSite, POLYGON, CRONOS } from "../../Helpers";

import { useWeb3React } from "@web3-react/core";

import APRLabel from "../APRLabel/APRLabel";

export default function TokenCard({ showRedirectModal }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  const BuyLink = ({ className, to, children, network }) => {
    if (isHome && showRedirectModal) {
      return (
        <div className={cx("a", className)} onClick={() => showRedirectModal(to)}>
          {children}
        </div>
      );
    }

    return (
      <Link to={to} className={cx(className)} onClick={() => changeNetwork(network)}>
        {children}
      </Link>
    );
  };

  return (
    <div className="Home-token-card-options">
      {/* <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={gmxBigIcon} alt="gmxBigIcon" /> GMX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            GMX is the utility and governance token. Accrues 30% of the platform's generated fees.
          </div>
          <div className="Home-token-card-option-apr">
            Arbitrum APR: <APRLabel chainId={ARBITRUM} label="gmxAprTotal" />, Avalanche APR:{" "}
            <APRLabel chainId={AVALANCHE} label="gmxAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_gmx" className="default-btn" network={ARBITRUM}>
                Buy on Arbitrum
              </BuyLink>
              <BuyLink to="/buy_gmx" className="default-btn" network={AVALANCHE}>
                Buy on Avalanche
              </BuyLink>
            </div>
            <a
              href="https://mmfinance.gitbook.io/madmex-spot-and-perps/tokenomics"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              Read more
            </a>
          </div>
        </div>
      </div> */}
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={glpBigIcon} alt="glpBigIcon" /> MLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            MLP is the liquidity provider token. Accrues 70% of the platform's generated fees.
          </div>
          <div className="Home-token-card-option-apr">
            {/* Arbitrum APR: <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />, Avalanche APR:{" "}
            <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" /> */}
            APR: <APRLabel chainId={chainId} label="mlpAprTotal" key={chainId} />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              {/* <BuyLink to="/buy_mlp" className="default-btn" network={ARBITRUM}>
                Buy on Arbitrum
              </BuyLink>
              <BuyLink to="/buy_mlp" className="default-btn" network={AVALANCHE}>
                Buy on Avalanche
              </BuyLink> */}
              <BuyLink to="/buy_mlp" className="default-btn" network={chainId}>
                Buy
              </BuyLink>
            </div>
            <a
              href="https://mmfinance.gitbook.io/madmex-spot-and-perps/mlp"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              Read more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
