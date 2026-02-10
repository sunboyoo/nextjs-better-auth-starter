import { getActiveAuthenticationProfileClientServer } from "@/config/authentication/client";
import { SignInMethodStep } from "../_components/sign-in-method-step";

export default function Page() {
  const profile = getActiveAuthenticationProfileClientServer();

  return <SignInMethodStep profile={profile} />;
}
