import type { ElectronProxyClientOptions } from "./types";

export function parseProtocolScheme(
  protocolOption: ElectronProxyClientOptions["protocol"],
) {
  if (typeof protocolOption === "string") {
    return {
      scheme: protocolOption,
      privileges: {},
    };
  }

  return {
    scheme: protocolOption.scheme,
    privileges: {},
  };
}
