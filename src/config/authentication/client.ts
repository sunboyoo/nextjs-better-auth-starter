import {
  getActiveAuthenticationProfileServer,
} from "./resolve";
import type { AuthenticationMethod, AuthenticationProfile, Identifier } from "./types";

type ClientServerEnforcement = {
  basePath: string;
  allowedPrimaryMethods: readonly AuthenticationMethod[];
  allowCallbacks?: boolean;
};

export type ClientAuthenticationProfile = {
  id: string;
  label: string;
  pages: AuthenticationProfile["pages"];
  identify: {
    identifiers: readonly Identifier[];
    primaryIdentifier: Identifier;
    socialPlacement: AuthenticationProfile["identify"]["socialPlacement"];
    antiEnumeration: AuthenticationProfile["identify"]["antiEnumeration"];
  };
  authenticate: AuthenticationProfile["authenticate"];
  mfa: AuthenticationProfile["mfa"];
  biometric?: AuthenticationProfile["biometric"];
  smsOtpDelivery?: AuthenticationProfile["smsOtpDelivery"];
  server: ClientServerEnforcement;
};

export function toClientAuthenticationProfile(
  profile: AuthenticationProfile,
): ClientAuthenticationProfile {
  return {
    id: profile.id,
    label: profile.label,
    pages: profile.pages,
    identify: profile.identify,
    authenticate: profile.authenticate,
    mfa: profile.mfa,
    biometric: profile.biometric,
    smsOtpDelivery: profile.smsOtpDelivery,
    server: {
      basePath: profile.server.basePath,
      allowedPrimaryMethods: profile.server.allowedPrimaryMethods,
      allowCallbacks: profile.server.allowCallbacks,
    },
  };
}

export function getActiveAuthenticationProfileClientServer(): ClientAuthenticationProfile {
  return toClientAuthenticationProfile(getActiveAuthenticationProfileServer());
}
