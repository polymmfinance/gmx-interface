import React from "react";

import { getConstant } from "../../Constants";
import { POLYGON } from "../../Helpers";

import StakeV1 from "./StakeV1";
import StakeV2 from "./StakeV2";

export default function Stake(props) {
  const chainId = POLYGON;
  const isV2 = getConstant(chainId, "v2");
  return isV2 ? <StakeV2 {...props} /> : <StakeV1 {...props} />;
}
