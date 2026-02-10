import { getActiveAuthenticationProfileClientServer } from "@/config/authentication/client";
import { SignInTwoFactorStep } from "../_components/sign-in-two-factor-step";

export default function Page() {
  const profile = getActiveAuthenticationProfileClientServer();

  return <SignInTwoFactorStep profile={profile} />;
}
