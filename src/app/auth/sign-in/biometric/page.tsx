import { getActiveAuthenticationProfileClientServer } from "@/config/authentication/client";
import { SignInBiometricStep } from "../_components/sign-in-biometric-step";

export default function Page() {
  const profile = getActiveAuthenticationProfileClientServer();

  return <SignInBiometricStep profile={profile} />;
}
