export interface ElectronOptions {
  codeExpiresIn?: number | undefined;
  redirectCookieExpiresIn?: number | undefined;
  cookiePrefix?: string | undefined;
  clientID?: string | undefined;
  disableOriginOverride?: boolean | undefined;
}

export interface ElectronProxyClientOptions {
  protocol:
    | string
    | {
        scheme: string;
      };
  callbackPath?: string;
  clientID?: string | undefined;
  cookiePrefix?: string | undefined;
}
