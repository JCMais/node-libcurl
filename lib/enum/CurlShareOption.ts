// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L2685
// not following enum naming convention on this one to keep consistent with other curl options
export enum CurlShareOption {
  SHARE = 1,
  UNSHARE = 2,
}
