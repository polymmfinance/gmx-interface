import React from "react";
import cx from "classnames";
import "./Footer.css";
import logoImg from "./img/ic_mmx_footer.svg";
import twitterIcon from "./img/ic_twitter.svg";
import discordIcon from "./img/ic_discord.svg";
import telegramIcon from "./img/ic_telegram.svg";
import githubIcon from "./img/ic_github.svg";
import mediumIcon from "./img/ic_medium.svg";
import { NavLink } from "react-router-dom";
import { isHomeSite, getAppBaseUrl, shouldShowRedirectModal } from "./Helpers";

const footerLinks = {
  home: [
    // { text: "Terms and Conditions", link: "/terms-and-conditions" },
    // { text: "Referral Terms", link: "/referral-terms" },
    // { text: "Media Kit", link: "https://mmfinance.gitbook.io/madmex-spot-and-perps/", external: true },
    // { text: "Jobs", link: "/jobs", isAppLink: true },
  ],
  app: [
    // { text: "Media Kit", link: "https://mmfinance.gitbook.io/madmex-spot-and-perps/", external: true },
    // { text: "Jobs", link: "/jobs" },
  ],
};

const socialLinks = [
  { link: "https://twitter.com/MMFcrypto", name: "Twitter", icon: twitterIcon },
  { link: "https://medium.com/@MMFinance", name: "Medium", icon: mediumIcon },
  // { link: "https://github.com/gmx-io", name: "Github", icon: githubIcon },
  { link: "https://discord.gg/madmeerkatnft", name: "Discord", icon: discordIcon },
  { link: "https://t.me/MMFcrypto", name: "Telegram", icon: telegramIcon },
];

export default function Footer({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();

  return (
    <div className="Footer">
      <div className={cx("Footer-wrapper", { home: isHome })}>
        <div className="Footer-logo">
          <img src={logoImg} alt="MetaMask" />
        </div>
        <div className="Footer-social-link-block">
          {socialLinks.map((platform) => {
            return (
              <a
                key={platform.name}
                className="App-social-link"
                href={platform.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={platform.icon} alt={platform.name} />
              </a>
            );
          })}
        </div>
        {/* <div className="Footer-links">
          {footerLinks[isHome ? "home" : "app"].map(({ external, text, link, isAppLink }) => {
            if (external) {
              return (
                <a key={text} target="_blank" href={link} className="Footer-link" rel="noopener noreferrer">
                  {text}
                </a>
              );
            }
            if (isAppLink) {
              if (shouldShowRedirectModal(redirectPopupTimestamp)) {
                return (
                  <div key={text} className="Footer-link a" onClick={() => showRedirectModal(link)}>
                    {text}
                  </div>
                );
              } else {
                const baseUrl = getAppBaseUrl();
                return (
                  <a key={text} href={baseUrl + link} className="Footer-link">
                    {text}
                  </a>
                );
              }
            }
            return (
              <NavLink key={link} to={link} className="Footer-link" activeClassName="active">
                {text}
              </NavLink>
            );
          })}
        </div> */}
      </div>
    </div>
  );
}
